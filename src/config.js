import path from 'node:path';

export function getConfig() {
  const rootDir = process.cwd();
  const nimbleApiBaseUrl = readEnv('NIMBLE_API_BASE_URL') ?? 'https://sdk.nimbleway.com/v1';
  const publicBaseUrl = readEnv('PUBLIC_BASE_URL') || inferPublicBaseUrl();

  return {
    port: Number(process.env.PORT ?? 4321),
    host: readEnv('HOST') ?? '127.0.0.1',
    nimbleApiKey: readEnv('NIMBLE_API_KEY') ?? '',
    nimbleApiBaseUrl,
    nimbleSearchUrl:
      readEnv('NIMBLE_SEARCH_URL') ?? 'https://nimble-retriever.webit.live/search',
    nimbleExtractUrl:
      readEnv('NIMBLE_EXTRACT_URL') ?? `${nimbleApiBaseUrl.replace(/\/$/, '')}/extract`,
    openAiApiKey: readEnv('OPENAI_API_KEY') ?? '',
    openAiModel: readEnv('OPENAI_MODEL') ?? 'gpt-4.1-mini',
    openAiTtsModel: readEnv('OPENAI_TTS_MODEL') ?? 'tts-1',
    openAiTtsVoice: readEnv('OPENAI_TTS_VOICE') ?? 'alloy',
    openAiTtsFormat: readEnv('OPENAI_TTS_FORMAT') ?? 'wav',
    openAiTtsTimeoutMs: Number(process.env.OPENAI_TTS_TIMEOUT_MS ?? 60000),
    calendarIcsUrl: readEnv('CALENDAR_ICS_URL') ?? '',
    calendarLookbackHours: Number(process.env.CALENDAR_LOOKBACK_HOURS ?? 24),
    calendarLookaheadHours: Number(process.env.CALENDAR_LOOKAHEAD_HOURS ?? 0),
    favoriteTeams: splitCsv(readEnv('FAVORITE_TEAMS') ?? ''),
    defaultTimezone: readEnv('DEFAULT_TIMEZONE') ?? 'America/New_York',
    outputDir: path.resolve(rootDir, process.env.OUTPUT_DIR ?? './output'),
    blobReadWriteToken: readEnv('BLOB_READ_WRITE_TOKEN') ?? '',
    blobAudioPathPrefix: readEnv('BLOB_AUDIO_PATH_PREFIX') ?? 'recaps',
    blobStoreAccess: readEnv('BLOB_STORE_ACCESS') === 'private' ? 'private' : 'public',
    publicBaseUrl,
    cronSecret: readEnv('CRON_SECRET') ?? '',
    cronAllowedDates: splitCsv(readEnv('CRON_ALLOWED_DATES') ?? ''),
    cronTimezone: readEnv('CRON_TIMEZONE') ?? 'America/New_York',
    deliveryWebhookUrl: readEnv('DELIVERY_WEBHOOK_URL') ?? '',
    deliveryDestinationName: readEnv('DELIVERY_DESTINATION_NAME') ?? 'webhook',
    assistantMinBusyMinutes: Number(process.env.ASSISTANT_MIN_BUSY_MINUTES ?? 45),
  };
}

export function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function inferPublicBaseUrl() {
  const productionUrl = readEnv('VERCEL_PROJECT_PRODUCTION_URL');
  if (productionUrl) {
    return `https://${productionUrl}`;
  }

  const deploymentUrl = readEnv('VERCEL_URL');
  if (deploymentUrl) {
    return `https://${deploymentUrl}`;
  }

  return `http://${readEnv('HOST') ?? '127.0.0.1'}:${process.env.PORT ?? 4321}`;
}
