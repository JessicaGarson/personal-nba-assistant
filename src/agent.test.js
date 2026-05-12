import test from 'node:test';
import assert from 'node:assert/strict';
import { decideNextAction } from './agent.js';
import { parseIcsEvents } from './services/calendar.js';
import { matchGamesToWindows } from './services/nba.js';
import {
  cleanExtractedText,
  filterAndRankLiveResults,
  filterAndRankSearchResultsForGame,
} from './services/nimble.js';
import { buildDeterministicRecapForTest, validateRecapForTest } from './services/openai.js';
import {
  buildDeliveryPayload,
  formatAssistantMessage,
  shouldSendAssistantRecap,
} from './services/delivery.js';

test('parseIcsEvents extracts summary and time range', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'SUMMARY:Birthday dinner',
    'DTSTART:20260507T230000Z',
    'DTEND:20260508T010000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const events = parseIcsEvents(ics);
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Birthday dinner');
});

test('matchGamesToWindows returns overlapping favorite team games', () => {
  const games = [
    {
      id: '1',
      name: 'Boston Celtics at New York Knicks',
      shortName: 'BOS @ NYK',
      startTime: '2026-05-07T23:30:00.000Z',
      status: 'Final',
      homeTeam: 'New York Knicks',
      awayTeam: 'Boston Celtics',
      homeScore: '101',
      awayScore: '99',
    },
    {
      id: '2',
      name: 'Dallas Mavericks at Phoenix Suns',
      shortName: 'DAL @ PHX',
      startTime: '2026-05-07T15:00:00.000Z',
      status: 'Final',
      homeTeam: 'Phoenix Suns',
      awayTeam: 'Dallas Mavericks',
      homeScore: '90',
      awayScore: '88',
    },
  ];

  const busyWindows = [
    {
      summary: 'Dinner',
      start: '2026-05-07T23:00:00.000Z',
      end: '2026-05-08T01:00:00.000Z',
    },
  ];

  const matches = matchGamesToWindows(games, busyWindows, ['Knicks']);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].shortName, 'BOS @ NYK');
  assert.equal(matches[0].isFavorite, true);
});

test('matchGamesToWindows keeps non-favorite overlapping games instead of hiding them', () => {
  const games = [
    {
      id: '1',
      name: 'Dallas Mavericks at Phoenix Suns',
      shortName: 'DAL @ PHX',
      startTime: '2026-05-07T23:30:00.000Z',
      status: 'Final',
      homeTeam: 'Phoenix Suns',
      awayTeam: 'Dallas Mavericks',
      homeScore: '90',
      awayScore: '88',
    },
  ];

  const busyWindows = [
    {
      summary: 'Dinner',
      start: '2026-05-07T23:00:00.000Z',
      end: '2026-05-08T01:00:00.000Z',
    },
  ];

  const matches = matchGamesToWindows(games, busyWindows, ['Knicks']);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].isFavorite, false);
});

test('matchGamesToWindows excludes scheduled 0-0 games from recap results', () => {
  const games = [
    {
      id: '1',
      name: 'Detroit Pistons at Cleveland Cavaliers',
      shortName: 'DET @ CLE',
      startTime: '2026-05-11T23:00:00.000Z',
      status: 'Scheduled',
      state: 'pre',
      completed: false,
      homeTeam: 'Cleveland Cavaliers',
      awayTeam: 'Detroit Pistons',
      homeScore: '0',
      awayScore: '0',
    },
  ];

  const busyWindows = [
    {
      summary: 'Dinner',
      start: '2026-05-11T22:30:00.000Z',
      end: '2026-05-12T00:30:00.000Z',
    },
  ];

  const matches = matchGamesToWindows(games, busyWindows, []);
  assert.equal(matches.length, 0);
});

test('cleanExtractedText removes NBA navigation boilerplate and keeps recap body', () => {
  const raw = [
    'Navigation Toggle[![NBA Logo](https://cdn.nba.com/logos/leagues/logo-nba.svg "NBA Logo")](https://www.nba.com/)',
    '*   [Games](https://www.nba.com/games)',
    '### 2026 Playoffs: East Semifinals | NYK (3) vs. PHI (7)',
    '# 4 takeaways: Jalen Brunson leads Knicks to heavy win over sluggish Sixers in Game 1',
    'The Knicks open their Eastern Conference semifinal against Philly the same way they ended the first round: A blowout victory.',
    'Jalen Brunson led the Knicks with 35 points on an efficient 12-for-18 shooting.',
    '### Related',
    '*   [### Recap: Knicks, Wolves win as Conference Semifinals tip off](https://www.nba.com/news/live-updates)',
    'NBA Organization',
    '*   [NBA ID Benefits](https://id.nba.com/)',
  ].join('\n');

  const cleaned = cleanExtractedText(raw);
  assert.match(cleaned, /4 takeaways: Jalen Brunson leads Knicks/);
  assert.match(cleaned, /Jalen Brunson led the Knicks with 35 points/);
  assert.doesNotMatch(cleaned, /Navigation Toggle/);
  assert.doesNotMatch(cleaned, /NBA Organization/);
  assert.doesNotMatch(cleaned, /### Related/);
});

test('shouldSendAssistantRecap skips delivery when busy time is too low', () => {
  const decision = shouldSendAssistantRecap(
    { assistantMinBusyMinutes: 45 },
    {
      games: [{ shortName: 'BOS @ NYK' }],
      diagnostics: { busyMinutes: 20, gameMatchesFound: 1 },
    },
  );

  assert.equal(decision.shouldSend, false);
  assert.match(decision.reason, /20 busy minute/);
});

test('decideNextAction explains zero busy time in plain language', () => {
  const decision = decideNextAction(
    { assistantMinBusyMinutes: 45 },
    {
      busyWindows: [],
      games: [{ shortName: 'PHI @ NYK' }],
      coverage: [{ searchResults: [], errors: [] }],
    },
  );

  assert.equal(decision.shouldNotify, false);
  assert.match(decision.reason, /No meaningful busy time/);
});

test('decideNextAction recommends notify when missed games overlap a meaningful busy window', () => {
  const decision = decideNextAction(
    { assistantMinBusyMinutes: 45 },
    {
      busyWindows: [
        {
          summary: 'Dinner',
          start: '2026-05-07T23:00:00.000Z',
          end: '2026-05-08T01:00:00.000Z',
        },
      ],
      games: [{ shortName: 'PHI @ NYK' }],
      coverage: [{ searchResults: [{}, {}], errors: [] }],
    },
  );

  assert.equal(decision.action, 'notify');
  assert.equal(decision.shouldNotify, true);
  assert.match(decision.reason, /Missed games were found/);
});

test('formatAssistantMessage creates a readable outbound assistant note', () => {
  const message = formatAssistantMessage({
    decision: { reason: 'Missed games were found during your busy window.' },
    audioUrl: 'http://127.0.0.1:4321/output/latest-recap.mp3',
    games: [
      {
        shortName: 'PHI @ NYK',
        finalScore: 'Philadelphia 76ers 102, New York Knicks 108',
      },
    ],
    script: 'The Knicks closed the game with a late 9-0 run.',
  });

  assert.match(message, /Assistant decision:/);
  assert.match(message, /You missed 1 NBA game/);
  assert.match(message, /Listen: http:\/\/127.0.0.1:4321\/output\/latest-recap\.mp3/);
  assert.match(message, /PHI @ NYK/);
  assert.match(message, /late 9-0 run/);
});

test('buildDeliveryPayload creates a Discord-native webhook body', () => {
  const payload = buildDeliveryPayload(
    {
      deliveryWebhookUrl: 'https://discord.com/api/webhooks/test/test',
      deliveryDestinationName: 'Discord',
    },
    {
      decision: { action: 'notify', reason: 'Missed games were found during your busy window.' },
      audioUrl: 'https://example.com/output/latest-recap.mp3',
      games: [
        {
          shortName: 'PHI @ NYK',
          finalScore: 'Philadelphia 76ers 102, New York Knicks 108',
        },
      ],
      script: 'The Knicks closed the game with a late 9-0 run.',
      diagnostics: {},
    },
    { shouldSend: true, reason: 'Missed games were found during your busy window.' },
    'ignored for discord',
  );

  assert.equal(typeof payload.content, 'string');
  assert.equal(Array.isArray(payload.embeds), true);
  assert.match(payload.content, /Your playoff catch-up is ready/);
  assert.match(payload.embeds[0].description, /late 9-0 run/);
  assert.match(payload.embeds[0].fields[1].value, /PHI @ NYK/);
});

test('buildDeliveryPayload omits unusable localhost listen links for Discord', () => {
  const payload = buildDeliveryPayload(
    {
      deliveryWebhookUrl: 'https://discord.com/api/webhooks/test/test',
      deliveryDestinationName: 'Discord',
    },
    {
      decision: { action: 'notify', reason: 'Missed games were found during your busy window.' },
      audioUrl: 'http://127.0.0.1:4321/output/latest-recap.mp3',
      games: [
        {
          shortName: 'PHI @ NYK',
          finalScore: 'Philadelphia 76ers 102, New York Knicks 108',
        },
      ],
      script: 'The Knicks closed the game with a late 9-0 run.',
      diagnostics: {},
    },
    { shouldSend: true, reason: 'Missed games were found during your busy window.' },
    'ignored for discord',
  );

  assert.equal(
    payload.embeds[0].fields.some((field) => field.name === 'Listen' && /127\.0\.0\.1/.test(field.value)),
    false,
  );
});

test('filterAndRankSearchResultsForGame pushes broad playoff roundup links behind game-specific recaps', () => {
  const game = {
    homeTeam: 'New York Knicks',
    awayTeam: 'Philadelphia 76ers',
    shortName: 'PHI @ NY',
  };

  const ranked = filterAndRankSearchResultsForGame(
    [
      {
        title: '2026 NBA playoffs: Schedule, scores, news and highlights',
        url: 'https://example.com/playoffs-schedule',
        snippet: 'Everything from around the league.',
        source: 'Example',
      },
      {
        title: 'Knicks beat 76ers 108-102 behind Jalen Brunson',
        url: 'https://example.com/knicks-76ers-recap',
        snippet: 'New York closed strong late against Philadelphia.',
        source: 'Example',
      },
    ],
    game,
  );

  assert.equal(ranked[0].url, 'https://example.com/knicks-76ers-recap');
});

test('filterAndRankLiveResults prefers live scoreboard-style links over recap pages', () => {
  const ranked = filterAndRankLiveResults(
    [
      {
        title: 'Knicks 113-102 Hawks (Apr 18, 2026) Final Score',
        url: 'https://example.com/knicks-76ers-recap',
        snippet: 'Older playoff result.',
        source: 'Example',
      },
      {
        title: 'NBA playoffs May 11, 2026 live scores',
        url: 'https://www.nba.com/games',
        snippet: 'Track live scores and in-progress games around the league.',
        source: 'NBA',
      },
      {
        title: 'Thunder vs. Lakers final score, results: Oklahoma City on the verge of sweeping Los Angeles',
        url: 'https://example.com/thunder-lakers-old',
        snippet: 'Published May 5, 2026.',
        source: 'Example',
      },
    ],
    'NBA playoffs May 11, 2026 live scores',
    [],
  );

  assert.equal(ranked[0].url, 'https://www.nba.com/games');
  assert.ok(!ranked.some((item) => item.url === 'https://example.com/knicks-76ers-recap'));
});

test('filterAndRankLiveResults filters out non-NBA live results', () => {
  const ranked = filterAndRankLiveResults(
    [
      {
        title: 'UFC 328 results, highlights: Sean Strickland upsets Khamzat Chimaev by split decision to claim title',
        url: 'https://www.cbssports.com/mma/news/ufc-328-results/',
        snippet: 'Live coverage and highlights from UFC 328.',
        source: 'cbssports.com',
      },
      {
        title: 'NBA playoffs May 11, 2026 live scores',
        url: 'https://www.nba.com/games',
        snippet: 'Track live scores and in-progress games around the league.',
        source: 'NBA',
      },
    ],
    'NBA playoffs May 11, 2026 live scores',
    [],
  );

  assert.equal(ranked[0].url, 'https://www.nba.com/games');
  assert.ok(!ranked.some((item) => item.url.includes('/mma/news/ufc-328-results')));
});

test('deterministic recap ignores unrelated source sentences from other games', () => {
  const recap = buildDeterministicRecapForTest({
    verifiedGameFacts: [
      {
        shortName: 'PHI @ NY',
        status: 'Final',
        finalScore: 'Philadelphia 76ers 102, New York Knicks 108',
        homeTeam: 'New York Knicks',
        awayTeam: 'Philadelphia 76ers',
        homeScore: '108',
        awayScore: '102',
        verifiedSourceNotes: [
          {
            title: 'Knicks recap',
            source: 'Example',
            url: 'https://example.com/knicks',
            snippet:
              'SGA lobs a beauty to Chet Holmgren for a Thunder alley-oop (0:16). The Knicks closed the game with a late 9-0 run.',
            extractedText: '',
          },
        ],
      },
    ],
  });

  assert.doesNotMatch(recap, /SGA|Thunder|Holmgren/);
  assert.match(recap, /The Knicks closed the game with a late 9-0 run/);
});

test('validateRecap treats series language as soft warnings but unrelated teams as hard warnings', () => {
  const payload = {
    verifiedGameFacts: [
      {
        homeTeam: 'New York Knicks',
        awayTeam: 'Philadelphia 76ers',
      },
    ],
  };

  const validation = validateRecapForTest(
    'The Knicks won Game 2 to take a 2-0 series lead, while the Thunder looked dangerous elsewhere.',
    payload,
  );

  assert.ok(validation.softWarnings.length > 0);
  assert.ok(validation.hardWarnings.some((warning) => warning.includes('thunder')));
});

test('validateRecap allows common team aliases for games in context', () => {
  const payload = {
    verifiedGameFacts: [
      {
        homeTeam: 'New York Knicks',
        awayTeam: 'Philadelphia 76ers',
      },
      {
        homeTeam: 'San Antonio Spurs',
        awayTeam: 'Minnesota Timberwolves',
      },
    ],
  };

  const validation = validateRecapForTest(
    'The Knicks held off the Sixers, and later the Spurs routed the Wolves.',
    payload,
  );

  assert.equal(validation.hardWarnings.length, 0);
});
