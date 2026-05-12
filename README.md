# Personal NBA Assistant

A calendar-aware NBA assistant that finds games you likely missed, researches current coverage, and turns the result into a playable briefing.

## What it does

When you open the app, it automatically:

1. looks at the past 24 hours
2. checks your calendar for busy time
3. matches overlapping NBA games
4. researches those games with live web data
5. generates a short recap script
6. optionally generates podcast audio

## Quick start

1. Copy `.env.example` to `.env`
2. Set the required values:

```env
NIMBLE_API_KEY=...
OPENAI_API_KEY=...
CALENDAR_ICS_URL=...
```

3. Run:

```bash
npm run app
```

4. Open [http://localhost:4321](http://localhost:4321)

## Main commands

```bash
npm run app
```

Runs the web app with automatic last-24-hours briefing generation.

```bash
npm run send
```

Runs the assistant and sends the result to `DELIVERY_WEBHOOK_URL` if delivery is configured.

```bash
npm run recap
```

Runs the recap flow in the terminal for debugging.

```bash
npm test
```

Runs the test suite.

## Environment

Required:

- `NIMBLE_API_KEY`
- `OPENAI_API_KEY`
- `CALENDAR_ICS_URL`

Common optional values:

- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`
- `OPENAI_TTS_FORMAT`
- `OPENAI_TTS_TIMEOUT_MS`
- `DELIVERY_WEBHOOK_URL`
- `ASSISTANT_MIN_BUSY_MINUTES`
- `BLOB_READ_WRITE_TOKEN`
- `BLOB_STORE_ACCESS=public|private`

## Vercel notes

This repo includes:

- `vercel.json` with `fluid: true`
- `maxDuration: 120` for the server runtime
- a cron route at `/api/cron/discord-send`

For deployed audio on Vercel:

- local development writes to `output/latest-recap.*`
- production uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is present
- `public` Blob stores return a direct audio URL
- `private` Blob stores stream audio back through `/api/audio`

## Discord delivery

Set:

```env
DELIVERY_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Then run:

```bash
npm run send
```

The app sends a Discord-friendly message with the recap, missed games, and audio when available.

## Scheduled delivery

Vercel cron schedules are UTC. The repo is currently configured to run:

- `30 16 * * *`

which maps to `12:30 PM` Eastern during daylight saving time.

To limit delivery to specific dates, use:

```env
CRON_SECRET=...
CRON_TIMEZONE=America/New_York
CRON_ALLOWED_DATES=2026-05-12,2026-05-13
```

After those dates pass, the scheduled endpoint stops sending updates.

## Architecture

The app is intentionally simple:

- `src/server.js` serves the web app and API routes
- `src/deepagents/runtime.ts` orchestrates the recap flow
- `src/services/*` handles calendar parsing, NBA matching, live research, recap generation, audio, and delivery

Structured game facts and retrieval stay deterministic for accuracy, while the agent layer shapes the final briefing.
