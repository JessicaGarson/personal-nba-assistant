import fs from 'node:fs/promises';
import { fetchWithTimeout } from '../lib/http.js';

export async function deliverRecap(config, result) {
  const decision = shouldSendAssistantRecap(config, result);
  if (!decision.shouldSend) {
    return {
      delivered: false,
      reason: decision.reason,
    };
  }

  if (!config.deliveryWebhookUrl) {
    return {
      delivered: false,
      reason: 'DELIVERY_WEBHOOK_URL is not configured.',
    };
  }

  const message = formatAssistantMessage(result);
  const request = isDiscordWebhookUrl(config.deliveryWebhookUrl)
    ? await buildDiscordDeliveryRequest(config, result, decision)
    : buildGenericDeliveryRequest(config, result, decision, message);

  const response = await fetchWithTimeout(config.deliveryWebhookUrl, request);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delivery failed: ${response.status} ${text}`);
  }

  return {
    delivered: true,
    destination: config.deliveryDestinationName,
  };
}

export function shouldSendAssistantRecap(config, result) {
  if (result.decision) {
    return {
      shouldSend: result.decision.shouldNotify,
      reason: result.decision.reason,
    };
  }

  const busyMinutes = result.diagnostics?.busyMinutes ?? 0;
  const gameMatchesFound = result.diagnostics?.gameMatchesFound ?? result.games.length;

  if (busyMinutes < config.assistantMinBusyMinutes) {
    return {
      shouldSend: false,
      reason:
        busyMinutes === 0
          ? 'Skipping send because no meaningful busy time was found in the selected window.'
          : `Skipping send because the selected window only included about ${busyMinutes} busy minute${busyMinutes === 1 ? '' : 's'}.`,
    };
  }

  if (gameMatchesFound < 1) {
    return {
      shouldSend: false,
      reason: 'Skipping send because no missed games were found.',
    };
  }

  return {
    shouldSend: true,
    reason: 'Missed games found during a meaningful busy window.',
  };
}

export function formatAssistantMessage(result) {
  const gameLines = result.games
    .map((game) => `- ${game.shortName}${game.finalScore ? ` | ${game.finalScore}` : ''}`)
    .join('\n');

  const parts = [
    `Assistant decision: ${result.decision?.reason ?? 'Missed games were found during your busy window.'}`,
    '',
    `You missed ${result.games.length} NBA game${result.games.length === 1 ? '' : 's'} while you were busy.`,
    result.audioUrl ? `Listen: ${result.audioUrl}` : null,
    '',
    'Games:',
    gameLines,
    '',
    'Podcast recap:',
    result.script,
  ].filter(Boolean);

  return parts.join('\n');
}

export function buildDeliveryPayload(config, result, decision, message) {
  if (isDiscordWebhookUrl(config.deliveryWebhookUrl)) {
    return buildDiscordPayload(result, decision);
  }

  return {
    destination: config.deliveryDestinationName,
    generatedAt: new Date().toISOString(),
    agent: {
      action: result.decision?.action ?? (decision.shouldSend ? 'notify' : 'skip'),
      reason: decision.reason,
    },
    text: message,
    script: result.script,
    audioUrl: result.audioUrl ?? null,
    games: result.games.map((game) => ({
      shortName: game.shortName,
      finalScore: game.finalScore,
      startTime: game.startTime,
    })),
    diagnostics: result.diagnostics,
  };
}

export function isDiscordWebhookUrl(url) {
  return /^https:\/\/(canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(String(url ?? ''));
}

function buildDiscordPayload(result, decision, options = {}) {
  const gameCount = result.games.length;
  const gameSummary = result.games
    .map((game) => `• ${game.shortName}${game.finalScore ? ` — ${game.finalScore}` : ''}`)
    .join('\n');
  const audioFieldValue = options.audioAttachmentName
    ? `Attached audio: ${options.audioAttachmentName}`
    : result.audioUrl && !isLocalAudioUrl(result.audioUrl)
      ? result.audioUrl
      : '';

  const fields = [
    {
      name: 'Why this was sent',
      value: truncateForDiscord(decision.reason || 'Missed games were found during your busy window.'),
      inline: false,
    },
    {
      name: 'Games you missed',
      value: truncateForDiscord(gameSummary || 'No matching games found.'),
      inline: false,
    },
  ];

  if (audioFieldValue) {
    fields.push({
      name: 'Listen',
      value: truncateForDiscord(audioFieldValue),
      inline: false,
    });
  }

  return {
    content: `Your playoff catch-up is ready${gameCount ? ` for ${gameCount} missed game${gameCount === 1 ? '' : 's'}` : ''}.`,
    embeds: [
      {
        title: 'Personal NBA Assistant',
        description: truncateForDiscord(result.script || 'No script available.', 4000),
        color: 0x111111,
        fields,
        footer: {
          text: 'Built from your recent schedule and current NBA coverage.',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function buildGenericDeliveryRequest(config, result, decision, message) {
  const payload = buildDeliveryPayload(config, result, decision, message);
  return {
    method: 'POST',
    timeoutMs: 15000,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/plain, */*',
    },
    body: JSON.stringify(payload),
  };
}

async function buildDiscordDeliveryRequest(config, result, decision) {
  const audioAttachmentName = result.audioPath ? getFileName(result.audioPath) : '';
  const payload = buildDiscordPayload(result, decision, { audioAttachmentName });

  if (!result.audioPath) {
    return {
      method: 'POST',
      timeoutMs: 15000,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
    };
  }

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  const buffer = await fs.readFile(result.audioPath);
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  form.append('files[0]', blob, audioAttachmentName || 'latest-recap.mp3');

  return {
    method: 'POST',
    timeoutMs: 30000,
    headers: {
      accept: 'application/json, text/plain, */*',
    },
    body: form,
  };
}

function getFileName(filePath) {
  return String(filePath ?? '').split('/').pop() ?? '';
}

function isLocalAudioUrl(url) {
  return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(String(url ?? ''));
}

function truncateForDiscord(value, limit = 1024) {
  const text = String(value ?? '');
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}
