import { fetchWithTimeout } from '../lib/http.js';
import { addHours } from '../lib/time.js';

export async function getBusyWindows(config, options = {}) {
  const now = new Date();
  const from = options.from ? new Date(options.from) : addHours(now, -config.calendarLookbackHours);
  const to = options.to ? new Date(options.to) : addHours(now, config.calendarLookaheadHours);

  if (!config.calendarIcsUrl) {
    return [];
  }

  let response;
  try {
    response = await fetchWithTimeout(config.calendarIcsUrl, {
      timeoutMs: 10000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach the calendar feed configured in CALENDAR_ICS_URL. ${message}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Could not fetch calendar feed from CALENDAR_ICS_URL: ${response.status}. ` +
      'If this is a private calendar URL, verify that it is still valid and accessible.',
    );
  }

  const ics = await response.text();
  return parseIcsEvents(ics).filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start < to && end > from;
  });
}

export function parseIcsEvents(icsText) {
  const normalized = icsText.replace(/\r\n/g, '\n');
  const blocks = normalized.split('BEGIN:VEVENT').slice(1);

  return blocks
    .map((block) => {
      const summary = readField(block, 'SUMMARY');
      const startRaw = readField(block, 'DTSTART');
      const endRaw = readField(block, 'DTEND');
      if (!summary || !startRaw || !endRaw) {
        return null;
      }

      return {
        summary,
        start: parseIcsDate(startRaw).toISOString(),
        end: parseIcsDate(endRaw).toISOString(),
      };
    })
    .filter(Boolean);
}

function readField(block, fieldName) {
  const line = block
    .split('\n')
    .find((entry) => entry.startsWith(`${fieldName}`));

  if (!line) {
    return '';
  }

  return line.split(':').slice(1).join(':').trim();
}

function parseIcsDate(value) {
  const compact = value.trim();

  if (/^\d{8}T\d{6}Z$/.test(compact)) {
    const year = compact.slice(0, 4);
    const month = compact.slice(4, 6);
    const day = compact.slice(6, 8);
    const hour = compact.slice(9, 11);
    const minute = compact.slice(11, 13);
    const second = compact.slice(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  if (/^\d{8}T\d{6}$/.test(compact)) {
    const year = compact.slice(0, 4);
    const month = compact.slice(4, 6);
    const day = compact.slice(6, 8);
    const hour = compact.slice(9, 11);
    const minute = compact.slice(11, 13);
    const second = compact.slice(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  if (/^\d{8}$/.test(compact)) {
    const year = compact.slice(0, 4);
    const month = compact.slice(4, 6);
    const day = compact.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }

  return new Date(compact);
}
