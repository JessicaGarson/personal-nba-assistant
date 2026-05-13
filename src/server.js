import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { get as getBlob } from '@vercel/blob';
import { getConfig, splitCsv } from './config.js';
import { runDeepAgentWorkflow } from './deepagents/runtime.ts';
import { getLiveUpdates } from './services/nimble.js';
import { generatePodcastAudio } from './services/audio.js';
import { runSendWorkflow } from './run-send-workflow.js';

const config = getConfig();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? `${config.host}:${config.port}`}`);

    if (req.method === 'GET' && req.url === '/api/health') {
      return sendJson(res, 200, {
        status: 'ok',
        mode: 'live',
        hasNimbleKey: Boolean(config.nimbleApiKey),
        hasOpenAiKey: Boolean(config.openAiApiKey),
        hasCalendarUrl: Boolean(config.calendarIcsUrl),
      });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/live') {
      const teams = splitCsv(requestUrl.searchParams.get('teams') ?? '')
        .slice(0, 4);
      const updates = await getLiveUpdates(
        {
          ...config,
          favoriteTeams: teams.length ? teams : config.favoriteTeams,
        },
        teams.length ? teams : config.favoriteTeams,
      );

      return sendJson(res, 200, {
        updatedAt: new Date().toISOString(),
        teams: teams.length ? teams : config.favoriteTeams,
        updates,
      });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/cron/discord-send') {
      if (!isAuthorizedCronRequest(config, req)) {
        return sendJson(res, 401, { error: 'Unauthorized cron request.' });
      }

      const todayInCronZone = getDateInTimeZone(config.cronTimezone);
      if (config.cronAllowedDates.length && !config.cronAllowedDates.includes(todayInCronZone)) {
        return sendJson(res, 200, {
          ok: true,
          skipped: true,
          reason: `Cron window is closed for ${todayInCronZone}.`,
        });
      }

      const { result, delivery } = await runSendWorkflow(config, {
        onProgress: (message) => console.error(`[cron] ${message}`),
      });

      return sendJson(res, 200, {
        ok: true,
        skipped: !delivery.delivered,
        delivered: delivery.delivered,
        reason: delivery.reason ?? null,
        destination: delivery.destination ?? null,
        action: result.decision.action,
        diagnostics: result.diagnostics,
      });
    }

    if (req.method === 'POST' && req.url === '/api/recap') {
      const body = await readJson(req);
      const result = await runDeepAgentWorkflow(
        {
          ...config,
          favoriteTeams: body.teams?.length ? splitCsv(body.teams) : config.favoriteTeams,
        },
        {
          from: body.from,
          to: body.to,
          generateAudio: body.generateAudio ?? true,
        },
      );

      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/audio') {
      const body = await readJson(req);
      const script = String(body.script ?? '').trim();

      if (!script) {
        return sendJson(res, 400, { error: 'A script is required to generate audio.' });
      }

      const audioAsset = await generatePodcastAudio(config, script);
      const audioUrl =
        audioAsset.audioUrl ??
        (audioAsset.blobPathname ? toPrivateBlobAudioPath(audioAsset.blobPathname) : null) ??
        (audioAsset.audioPath ? toLocalAudioPath(audioAsset.audioPath) : null);

      return sendJson(res, 200, {
        audioPath: audioAsset.audioPath ?? null,
        audioUrl,
        storage: audioAsset.storage,
      });
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/audio') {
      const pathname = requestUrl.searchParams.get('pathname');
      if (!pathname) {
        return sendJson(res, 400, { error: 'Missing pathname' });
      }

      if (config.blobStoreAccess !== 'private') {
        return sendJson(res, 400, {
          error: 'Private Blob streaming is only used when BLOB_STORE_ACCESS=private.',
        });
      }

      const result = await getBlob(pathname, {
        access: 'private',
        token: config.blobReadWriteToken || undefined,
        ifNoneMatch: req.headers['if-none-match'] ?? undefined,
      });

      if (!result) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      if (result.statusCode === 304) {
        res.writeHead(304, {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        });
        res.end();
        return;
      }

      res.writeHead(200, {
        'content-type': result.blob.contentType || getAudioContentType(pathname),
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
        'X-Content-Type-Options': 'nosniff',
      });

      Readable.fromWeb(result.stream).pipe(res);
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      const html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && req.url?.startsWith('/output/')) {
      const fileName = req.url.replace('/output/', '');
      const filePath = path.join(config.outputDir, fileName);
      const buffer = await fs.readFile(filePath);
      res.writeHead(200, { 'content-type': getAudioContentType(fileName) });
      res.end(buffer);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[server] Request failed');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error(JSON.stringify(error, null, 2));
    }
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

server.on('error', (error) => {
  console.error(`Could not start server on ${config.host}:${config.port}`);
  console.error(error);
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  console.log(`Personal NBA Assistant running at http://${config.host}:${config.port}`);
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function toPublicAudioUrl(config, audioPath) {
  const fileName = audioPath.split('/').pop();
  return `${config.publicBaseUrl.replace(/\/$/, '')}/output/${fileName}`;
}

function toPrivateBlobAudioUrl(config, pathname) {
  return `${config.publicBaseUrl.replace(/\/$/, '')}/api/audio?pathname=${encodeURIComponent(pathname)}`;
}

function toLocalAudioPath(audioPath) {
  const fileName = audioPath.split('/').pop();
  return `/output/${fileName}`;
}

function toPrivateBlobAudioPath(pathname) {
  return `/api/audio?pathname=${encodeURIComponent(pathname)}`;
}

function getAudioContentType(fileName) {
  if (String(fileName).endsWith('.wav')) return 'audio/wav';
  if (String(fileName).endsWith('.pcm')) return 'audio/L16';
  return 'audio/mpeg';
}

function isAuthorizedCronRequest(config, req) {
  if (!config.cronSecret) {
    return false;
  }

  return req.headers.authorization === `Bearer ${config.cronSecret}`;
}

function getDateInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}
