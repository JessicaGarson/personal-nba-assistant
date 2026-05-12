import Nimble from '@nimble-way/nimble-js';

export async function findCoverageForGames(config, games) {
  const coverage = [];

  for (const game of games) {
    const results = await searchGameCoverage(config, game);
    const topResults = results.slice(0, 3);
    const extracts = [];
    const errors = [];

    for (const result of topResults) {
      try {
        const text = await extractArticle(config, result.url);
        extracts.push({
          ...result,
          extractedText: text,
        });
      } catch (error) {
        errors.push({
          url: result.url,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    coverage.push({
      game,
      searchResults: topResults,
      extracts,
      errors,
    });
  }

  return coverage;
}

export async function searchGameCoverage(config, game) {
  if (!config.nimbleApiKey) {
    throw new Error('NIMBLE_API_KEY is required for live search.');
  }

  const client = getNimbleClient(config);
  const attempts = [
    {
      query: buildSearchQuery(game),
      max_results: 5,
      focus: 'news',
      search_depth: 'lite',
    },
    {
      query: `${game.name} ${toLongDate(game.startTime)} recap highlights`,
      max_results: 5,
      focus: 'general',
      search_depth: 'lite',
    },
  ];

  for (const body of attempts) {
    let response;
    try {
      response = await client.search(body, {
        timeout: 20000,
        maxRetries: 1,
      });
    } catch (error) {
      throw new Error(
        `Nimble search failed for ${game.shortName} using the official SDK with payload ${JSON.stringify(body)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const results = rankSearchResults(mapSearchResults(response), game);
    if (results.length) {
      return results;
    }
  }

  return [];
}

export async function getLiveUpdates(config, teams = []) {
  if (!config.nimbleApiKey) {
    throw new Error('NIMBLE_API_KEY is required for live updates.');
  }

  const client = getNimbleClient(config);
  const normalizedTeams = teams.filter(Boolean).slice(0, 4);
  const queries = buildLiveUpdateQueries(normalizedTeams);
  const collected = [];
  const dateHints = getLiveDateHints();

  for (const query of queries) {
    const response = await client.search(
      {
        query,
        max_results: 5,
        focus: 'news',
        search_depth: 'lite',
        start_date: dateHints.yesterdayKey,
        end_date: dateHints.todayKey,
        include_domains: getTrustedLiveDomains(),
      },
      {
        timeout: 20000,
        maxRetries: 1,
      },
    );

    const ranked = rankLiveResults(mapSearchResults(response), query, normalizedTeams);
    for (const result of ranked) {
      collected.push({
        ...result,
        query,
      });
    }
  }

  const deduped = dedupeLiveResults(collected);
  return deduped.slice(0, 6);
}

function mapSearchResults(response) {
  const results = response.results ?? response.items ?? response.data ?? [];
  return results
    .filter((item) => item.url ?? item.link)
    .map((item) => ({
      title: item.title ?? item.name ?? 'Untitled result',
      url: item.url ?? item.link ?? '',
      snippet: item.snippet ?? item.description ?? '',
      source:
        item.source ??
        item.domain ??
        item.metadata?.domain ??
        item.metadata?.source ??
        '',
    }));
}

function rankSearchResults(results, game) {
  return results
    .map((result) => ({
      ...result,
      relevance: scoreSearchResult(result, game),
    }))
    .filter((result) => result.relevance > 0)
    .sort((left, right) => right.relevance - left.relevance)
    .map(({ relevance, ...result }) => result);
}

export function filterAndRankSearchResultsForGame(results, game) {
  return rankSearchResults(results, game);
}

export function filterAndRankLiveResults(results, query, teams = []) {
  return rankLiveResults(results, query, teams);
}

function scoreSearchResult(result, game) {
  const haystack = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const home = game.homeTeam.toLowerCase();
  const away = game.awayTeam.toLowerCase();
  const homeShort = shortTeamName(game.homeTeam).toLowerCase();
  const awayShort = shortTeamName(game.awayTeam).toLowerCase();
  const shortName = game.shortName.toLowerCase();

  let score = 0;

  if (haystack.includes(home)) score += 4;
  if (haystack.includes(away)) score += 4;
  if (homeShort && haystack.includes(homeShort)) score += 2;
  if (awayShort && haystack.includes(awayShort)) score += 2;
  if (haystack.includes(shortName)) score += 3;
  if (haystack.includes('recap')) score += 4;
  if (haystack.includes('takeaways')) score += 3;
  if (haystack.includes('analysis')) score += 2;
  if (haystack.includes('associated press')) score += 2;

  if (
    haystack.includes('schedule') ||
    haystack.includes('scores, news and highlights') ||
    haystack.includes('live updates') ||
    haystack.includes('tap to watch') ||
    haystack.includes('/news/2026-nba-playoffs-schedule') ||
    haystack.includes('/news/live-updates')
  ) {
    score -= 8;
  }

  if (!(haystack.includes(homeShort) || haystack.includes(awayShort) || haystack.includes(home) || haystack.includes(away))) {
    score -= 10;
  }

  return score;
}

function buildLiveUpdateQueries(teams) {
  const dateHints = getLiveDateHints();
  const base = [
    `NBA playoffs ${dateHints.todayLong} live scores`,
    `NBA playoffs ${dateHints.todayLong} live updates`,
    `NBA playoffs past 24 hours ${dateHints.todayLong} scores`,
    `NBA playoffs ${dateHints.todayShort} scoreboard`,
  ];
  const teamQueries = teams.flatMap((team) => [
    `${team} ${dateHints.todayLong} live score`,
    `${team} ${dateHints.todayLong} game updates`,
    `${team} playoffs ${dateHints.todayShort} score`,
  ]);

  return [...teamQueries, ...base];
}

function rankLiveResults(results, query, teams = []) {
  return results
    .map((result) => ({
      ...result,
      relevance: scoreLiveResult(result, query, teams),
    }))
    .filter((result) => result.relevance > 0)
    .sort((left, right) => right.relevance - left.relevance)
    .map(({ relevance, ...result }) => result);
}

function scoreLiveResult(result, query, teams = []) {
  const haystack = `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
  const dateHints = getLiveDateHints();
  const trustedHost = getTrustedLiveHostScore(result.url);
  const recency = scoreLiveRecency(result, dateHints);
  let score = 0;

  for (const team of teams) {
    const normalized = team.toLowerCase();
    if (haystack.includes(normalized)) score += 4;
  }

  if (haystack.includes('live')) score += 5;
  if (haystack.includes('tonight')) score += 3;
  if (haystack.includes('score')) score += 3;
  if (haystack.includes('scores')) score += 3;
  if (haystack.includes('updates')) score += 2;
  if (haystack.includes('nba')) score += 8;
  if (haystack.includes('basketball')) score += 5;
  if (haystack.includes('playoffs')) score += 3;
  if (haystack.includes(dateHints.todayLongLower)) score += 6;
  if (haystack.includes(dateHints.todayShortLower)) score += 4;
  if (haystack.includes(dateHints.yesterdayLongLower)) score += 3;
  if (haystack.includes(dateHints.yesterdayShortLower)) score += 2;
  if (haystack.includes('stream')) score -= 5;
  if (haystack.includes('ticket')) score -= 6;
  if (haystack.includes('bet')) score -= 5;
  if (haystack.includes('fantasy')) score -= 3;
  if (haystack.includes('recap')) score -= 4;
  if (haystack.includes('takeaways')) score -= 4;
  if (haystack.includes('series')) score -= 3;
  if (haystack.includes('final')) score -= 2;
  if (haystack.includes('yesterday')) score -= 4;
  if (haystack.includes('last night')) score -= 4;
  if (haystack.includes('schedule')) score += 1;
  if (haystack.includes('nba.com/games')) score += 4;
  if (haystack.includes('espn.com/nba/scoreboard')) score += 4;
  if (haystack.includes('cbssports.com/nba/gametracker')) score += 3;
  if (haystack.includes('april') && !dateHints.todayLongLower.includes('april')) score -= 6;
  if (haystack.includes('(apr') && !dateHints.todayShortLower.includes('apr')) score -= 6;
  if (containsNonNbaSportsTerms(haystack)) score -= 20;
  if (!looksLikeNbaCoverage(haystack, teams)) score -= 12;
  score += trustedHost;
  score += recency;

  if (!teams.length && query.toLowerCase().includes('nba')) {
    score += 1;
  }

  return score;
}

function dedupeLiveResults(results) {
  const seen = new Set();
  const deduped = [];

  for (const result of results) {
    const key = result.url || `${result.title}-${result.source}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function getLiveDateHints(now = new Date()) {
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const longFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const shortFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const todayLong = longFormatter.format(today);
  const todayShort = shortFormatter.format(today);
  const yesterdayLong = longFormatter.format(yesterday);
  const yesterdayShort = shortFormatter.format(yesterday);

  return {
    todayLong,
    todayShort,
    yesterdayLong,
    yesterdayShort,
    todayKey: toDateKey(today),
    yesterdayKey: toDateKey(yesterday),
    todayLongLower: todayLong.toLowerCase(),
    todayShortLower: todayShort.toLowerCase(),
    yesterdayLongLower: yesterdayLong.toLowerCase(),
    yesterdayShortLower: yesterdayShort.toLowerCase(),
  };
}

function scoreLiveRecency(result, dateHints) {
  const referencedDate = extractReferencedDate(result);
  if (!referencedDate) {
    return 0;
  }

  const key = toDateKey(referencedDate);
  if (key === dateHints.todayKey) {
    return 10;
  }

  if (key === dateHints.yesterdayKey) {
    return 6;
  }

  const today = new Date(dateHints.todayKey);
  const diffDays = Math.round((today.getTime() - referencedDate.getTime()) / 86400000);

  if (diffDays > 1) {
    return -18;
  }

  if (diffDays < 0) {
    return -8;
  }

  return 0;
}

function extractReferencedDate(result) {
  const haystack = `${result.title} ${result.snippet} ${result.url}`;
  const explicitDate =
    haystack.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+202\d\b/i) ||
    haystack.match(/\b202\d[-/]\d{2}[-/]\d{2}\b/) ||
    haystack.match(/\((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+202\d\)/i);

  if (!explicitDate) {
    return null;
  }

  const value = explicitDate[0].replace(/[()]/g, '').replace(/\//g, '-');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getTrustedLiveHostScore(url) {
  const host = getHost(url);
  if (!host) {
    return 0;
  }

  if (host.includes('nba.com')) return 5;
  if (host.includes('espn.com')) return 5;
  if (host.includes('cbssports.com')) return 4;
  if (host.includes('sports.yahoo.com')) return 3;
  if (host.includes('apnews.com')) return 2;
  return 0;
}

function looksLikeNbaCoverage(haystack, teams = []) {
  if (haystack.includes('nba') || haystack.includes('basketball') || haystack.includes('playoffs')) {
    return true;
  }

  for (const team of teams) {
    if (haystack.includes(team.toLowerCase())) {
      return true;
    }
  }

  return (
    haystack.includes('knicks') ||
    haystack.includes('celtics') ||
    haystack.includes('cavaliers') ||
    haystack.includes('pacers') ||
    haystack.includes('thunder') ||
    haystack.includes('lakers') ||
    haystack.includes('warriors') ||
    haystack.includes('timberwolves') ||
    haystack.includes('nuggets') ||
    haystack.includes('spurs') ||
    haystack.includes('pistons') ||
    haystack.includes('suns') ||
    haystack.includes('bucks') ||
    haystack.includes('heat') ||
    haystack.includes('76ers') ||
    haystack.includes('sixers')
  );
}

function containsNonNbaSportsTerms(haystack) {
  return (
    haystack.includes('ufc') ||
    haystack.includes('mma') ||
    haystack.includes('boxing') ||
    haystack.includes('mlb') ||
    haystack.includes('baseball') ||
    haystack.includes('nhl') ||
    haystack.includes('hockey') ||
    haystack.includes('nfl') ||
    haystack.includes('football') ||
    haystack.includes('soccer') ||
    haystack.includes('premier league') ||
    haystack.includes('champions league') ||
    haystack.includes('tennis') ||
    haystack.includes('golf')
  );
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

function toDateKey(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export async function extractArticle(config, url) {
  const client = getNimbleClient(config);
  const requestBody = {
    url,
    render: true,
    driver: 'vx8',
    formats: ['markdown'],
    locale: 'en-US',
    country: 'US',
  };

  let response;
  try {
    response = await client.extract(
      requestBody,
      {
        timeout: 30000,
        maxRetries: 1,
      },
    );
  } catch (error) {
    throw new Error(
      `Nimble extract failed using the official SDK with payload ${JSON.stringify(requestBody)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return cleanExtractedText(
    (
    response.data?.markdown ??
    response.text ??
    response.content ??
    response.data?.text ??
    response.data?.content ??
    response.data?.html ??
    ''
    ),
  );
}

export function cleanExtractedText(rawText) {
  if (!rawText) {
    return '';
  }

  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[ ]{2,}/g, ' ');

  const anchorMarkers = [
    '\n# ',
    '\n## ',
    'Game Recap',
    'Here are some notes, quotes, numbers and film',
    'By ',
    'Associated Press',
  ];

  let cropped = normalized;
  for (const marker of anchorMarkers) {
    const index = cropped.indexOf(marker);
    if (index > 0) {
      cropped = cropped.slice(index).trimStart();
      break;
    }
  }

  const stopMarkers = [
    '\n### Related',
    '\n### Latest',
    '\nNBA Organization',
    '\nShop\n',
    '\nSubscriptions\n',
    '\n© ',
    '\nPrivacy Policy',
    '\nIf you are having difficulty accessing any content on this website',
  ];

  for (const marker of stopMarkers) {
    const index = cropped.indexOf(marker);
    if (index > 0) {
      cropped = cropped.slice(0, index);
    }
  }

  const lines = cropped
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !shouldDropLine(line));

  const compact = [];
  for (const line of lines) {
    if (compact[compact.length - 1] === line) {
      continue;
    }

    compact.push(line);
  }

  return compact
    .join('\n')
    .replace(/\* \*/g, ' ')
    .replace(/\* /g, '')
    .replace(/[ ]{2,}/g, ' ')
    .trim()
    .slice(0, 6000);
}

function buildSearchQuery(game) {
  return [
    game.name,
    toLongDate(game.startTime),
    game.finalScore ?? '',
    'NBA recap analysis final score key takeaways',
  ].join(' ');
}

function getNimbleClient(config) {
  return new Nimble({
    apiKey: config.nimbleApiKey,
    baseURL: normalizeNimbleBaseUrl(config.nimbleApiBaseUrl),
    timeout: 30000,
    maxRetries: 1,
  });
}

function normalizeNimbleBaseUrl(value) {
  const base = value || 'https://sdk.nimbleway.com';
  return base.replace(/\/v1\/?$/, '');
}

function getTrustedLiveDomains() {
  return [
    'nba.com',
    'espn.com',
    'cbssports.com',
    'sports.yahoo.com',
    'apnews.com',
  ];
}

function shortTeamName(teamName) {
  return teamName
    .replace(/^Philadelphia\s+/i, '')
    .replace(/^New York\s+/i, '')
    .replace(/^San Antonio\s+/i, '')
    .replace(/^Minnesota\s+/i, '')
    .replace(/^Los Angeles\s+/i, '')
    .replace(/^Golden State\s+/i, '')
    .replace(/^Boston\s+/i, '')
    .replace(/^Phoenix\s+/i, '')
    .replace(/^Dallas\s+/i, '')
    .replace(/^Milwaukee\s+/i, '')
    .replace(/^Oklahoma City\s+/i, '')
    .replace(/^New Orleans\s+/i, '')
    .replace(/^Portland\s+/i, '')
    .replace(/^Utah\s+/i, '')
    .replace(/^Toronto\s+/i, '')
    .replace(/^Brooklyn\s+/i, '')
    .replace(/^Chicago\s+/i, '')
    .replace(/^Atlanta\s+/i, '')
    .replace(/^Charlotte\s+/i, '')
    .replace(/^Orlando\s+/i, '')
    .replace(/^Washington\s+/i, '')
    .trim();
}

function toLongDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

function shouldDropLine(line) {
  const lowercase = line.toLowerCase();

  if (
    lowercase.startsWith('navigation toggle') ||
    lowercase.startsWith('schedule') ||
    lowercase.startsWith('games') ||
    lowercase.startsWith('home') ||
    lowercase.startsWith('watch') ||
    lowercase.startsWith('news') ||
    lowercase.startsWith('stats') ||
    lowercase.startsWith('standings') ||
    lowercase.startsWith('teams') ||
    lowercase.startsWith('players') ||
    lowercase.startsWith('fantasy') ||
    lowercase.startsWith('tickets') ||
    lowercase.startsWith('affiliates') ||
    lowercase.startsWith('sign in') ||
    lowercase.startsWith('customer support') ||
    lowercase.startsWith('privacy policy') ||
    lowercase.startsWith('cookie policy') ||
    lowercase.startsWith('accessibility and closed captions') ||
    lowercase.startsWith('by the associated press') ||
    lowercase.startsWith('from nba.com news services') ||
    lowercase.startsWith('updated on ') ||
    lowercase.startsWith('may ') ||
    lowercase.startsWith('manage preferences')
  ) {
    return true;
  }

  if (
    line.includes('https://cdn.nba.com/logos/') ||
    line.includes('Facebook](https://facebook.com') ||
    line.includes('Instagram](https://instagram.com') ||
    line.includes('League Pass') && line.includes('logo')
  ) {
    return true;
  }

  if (/^[*![\]()#\-.0-9 :|]+$/.test(line) && line.length < 4) {
    return true;
  }

  return false;
}
