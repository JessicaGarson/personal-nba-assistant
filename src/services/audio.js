import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { fetchWithTimeout } from '../lib/http.js';

export async function generatePodcastAudio(config, scriptText) {
  if (!config.openAiApiKey) {
    return {
      audioPath: null,
      audioUrl: null,
      blobPathname: null,
      storage: 'none',
    };
  }

  return generateWithOpenAi(config, scriptText);
}

async function generateWithOpenAi(config, scriptText) {
  const attempts = buildTtsAttempts(config, scriptText);
  let lastError;

  for (const attempt of attempts) {
    try {
      const arrayBuffer = await requestSpeech(config, attempt);
      return shouldUploadAudioToBlob(config)
        ? uploadAudioToBlob(config, arrayBuffer, attempt.format)
        : writeAudioFile(config, arrayBuffer, attempt.format);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Audio generation failed.'));
}

async function requestSpeech(config, attempt) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    timeoutMs: attempt.timeoutMs,
    headers: {
      authorization: `Bearer ${config.openAiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: attempt.model,
      voice: attempt.voice,
      input: attempt.input,
      format: attempt.format,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI audio generation failed (${attempt.model}/${attempt.format}): ${response.status} ${text}`);
  }

  return response.arrayBuffer();
}

function buildTtsAttempts(config, scriptText) {
  const shortenedScript = shortenForAudio(scriptText);
  const attempts = [
    {
      model: config.openAiTtsModel,
      voice: config.openAiTtsVoice,
      format: config.openAiTtsFormat,
      input: shortenedScript,
      timeoutMs: config.openAiTtsTimeoutMs,
    },
  ];

  if (config.openAiTtsModel !== 'tts-1' || config.openAiTtsFormat !== 'wav') {
    attempts.push({
      model: 'tts-1',
      voice: supportsTts1Voice(config.openAiTtsVoice) ? config.openAiTtsVoice : 'alloy',
      format: 'wav',
      input: shortenedScript,
      timeoutMs: Math.min(config.openAiTtsTimeoutMs, 45000),
    });
  }

  return attempts;
}

function shortenForAudio(scriptText) {
  const normalized = String(scriptText ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 900) {
    return normalized;
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+/g) ?? [normalized];
  let output = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if ((output + ' ' + trimmed).trim().length > 900) break;
    output = `${output} ${trimmed}`.trim();
  }

  return output || normalized.slice(0, 900);
}

function supportsTts1Voice(voice) {
  return new Set(['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']).has(String(voice));
}

async function writeAudioFile(config, arrayBuffer, format) {
  await fs.mkdir(config.outputDir, { recursive: true });
  const outputPath = path.join(config.outputDir, `latest-recap.${getFileExtension(format)}`);
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(outputPath, buffer);
  return {
    audioPath: outputPath,
    audioUrl: null,
    blobPathname: null,
    storage: 'local',
  };
}

async function uploadAudioToBlob(config, arrayBuffer, format) {
  const pathname = `${config.blobAudioPathPrefix.replace(/\/+$/, '')}/latest-recap-${Date.now()}.${getFileExtension(format)}`;
  const blob = await put(pathname, Buffer.from(arrayBuffer), {
    access: config.blobStoreAccess,
    addRandomSuffix: false,
    contentType: getContentType(format),
    token: config.blobReadWriteToken || undefined,
  });

  return {
    audioPath: null,
    audioUrl: config.blobStoreAccess === 'public' ? blob.url : null,
    blobPathname: blob.pathname,
    storage: config.blobStoreAccess === 'public' ? 'blob-public' : 'blob-private',
  };
}

function shouldUploadAudioToBlob(config) {
  return Boolean(config.blobReadWriteToken);
}

function getFileExtension(format) {
  if (format === 'wav') return 'wav';
  if (format === 'pcm') return 'pcm';
  return 'mp3';
}

function getContentType(format) {
  if (format === 'wav') return 'audio/wav';
  if (format === 'pcm') return 'audio/L16';
  return 'audio/mpeg';
}
