import { postJson } from '../lib/http.js';

export async function generatePodcastRecap(config, payload) {
  if (!config.openAiApiKey) {
    return {
      script: buildDeterministicRecap(payload),
      mode: 'deterministic-no-openai',
      warnings: ['OPENAI_API_KEY missing, used deterministic recap fallback.'],
    };
  }

  try {
    const input = buildPrompt(payload);
    const response = await postJson(
      'https://api.openai.com/v1/responses',
      {
        model: config.openAiModel,
        input,
      },
      {
        headers: {
          authorization: `Bearer ${config.openAiApiKey}`,
        },
        timeoutMs: 30000,
      },
    );

    const script =
      response.output_text ??
      response.output?.map((item) => item.content?.map((part) => part.text).join('')).join('\n') ??
      '';

    const validation = validateGeneratedRecap(script, payload);
    if (validation.hardWarnings.length) {
      return {
        script: buildDeterministicRecap(payload),
        mode: 'deterministic-validated-fallback',
        warnings: [...validation.hardWarnings, ...validation.softWarnings],
      };
    }

    return {
      script: polishGeneratedRecap(script),
      mode: validation.softWarnings.length ? 'openai-with-warnings' : 'openai',
      warnings: validation.softWarnings,
    };
  } catch (error) {
    return {
      script: buildDeterministicRecap(payload),
      mode: 'deterministic-openai-error',
      warnings: [
        `OpenAI recap generation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

function buildPrompt(payload) {
  return [
    'Create a podcast-style NBA recap that sounds like a sharp morning sports update.',
    'Keep it under 300 words, energetic but factual, and organized from most relevant game to least relevant game.',
    'Use only the verified game facts and verified source notes provided below.',
    'Include final scores when available, key storylines, and one concluding theme that ties the night together.',
    'Do not mention series score, game number, standings, or injury details unless they appear explicitly in the verified source notes for that exact game.',
    'If a source note seems stale or contradictory to the verified game facts, ignore it.',
    'Never contradict the verified final score or teams.',
    'Do not mention that web search or AI were used.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export function validateGeneratedRecap(script, payload) {
  const softWarnings = [];
  const hardWarnings = [];
  const suspiciousPatterns = [
    /\b\d-\d\b.*series/i,
    /\bseries lead\b/i,
    /\bGame\s+[1-7]\b/i,
    /\bgo up\s+\d-\d\b/i,
    /\btake a\s+\d-\d\s+lead\b/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(script)) {
      softWarnings.push(`Model output included suspicious series context: ${pattern}`);
    }
  }

  for (const warning of detectUnrelatedTeamMentions(script, payload)) {
    hardWarnings.push(warning);
  }

  return {
    softWarnings,
    hardWarnings,
  };
}

function buildDeterministicRecap(payload) {
  const games = payload.verifiedGameFacts ?? [];
  if (!games.length) {
    return 'No missed NBA games were found in the selected window.';
  }

  const intro =
    games.length === 1
      ? 'Here is the NBA game you missed in the last 24 hours.'
      : 'Here are the NBA games you missed in the last 24 hours.';
  const body = games.map(buildGameParagraph).join('\n\n');
  const outro =
    games.length > 1
      ? 'That is the quick catch-up from the slate you missed.'
      : 'That is the quick catch-up from the game you missed.';

  return [intro, body, outro].join('\n\n');
}

export function buildDeterministicRecapForTest(payload) {
  return buildDeterministicRecap(payload);
}

export function validateRecapForTest(script, payload) {
  return validateGeneratedRecap(script, payload);
}

function buildGameParagraph(game) {
  const winner =
    Number(game.homeScore || 0) > Number(game.awayScore || 0) ? game.homeTeam : game.awayTeam;
  const loser = winner === game.homeTeam ? game.awayTeam : game.homeTeam;
  const winnerScore = winner === game.homeTeam ? game.homeScore : game.awayScore;
  const loserScore = winner === game.homeTeam ? game.awayScore : game.homeScore;
  const winnerShort = shortTeamName(winner);
  const loserShort = shortTeamName(loser);

  const scoreLine =
    game.finalScore && winnerScore && loserScore
      ? `In ${cityFromTeam(game.homeTeam)}, the ${winnerShort} beat the ${loserShort} ${winnerScore}-${loserScore}.`
      : `${game.shortName} ended with status ${game.status}.`;

  const summarySentences = pickCleanSentencesFromNotes(game, game.verifiedSourceNotes ?? [], 1);
  const storyLine = summarySentences.length
    ? sanitizeStoryline(summarySentences[0])
    : buildPlainScoreStory(game);

  return `${scoreLine} ${storyLine}`.trim();
}

function pickCleanSentencesFromNotes(game, notes, limit) {
  const picked = [];

  for (const note of notes) {
    const raw = note.snippet || note.extractedText || '';
    const lines = raw
      .split('\n')
      .map((line) => normalizeProse(line))
      .filter(Boolean)
      .filter((line) => isNarrativeLine(line));

    for (const line of lines) {
      const sentences = line
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .filter((sentence) => isUsableSentence(sentence))
        .filter((sentence) => isSentenceRelevantToGame(sentence, game));

      for (const sentence of sentences) {
        if (!picked.includes(sentence)) {
          picked.push(sentence);
        }

        if (picked.length >= limit) {
          return picked;
        }
      }
    }
  }

  return picked;
}

function normalizeProse(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/#+\s*/g, '')
    .replace(/\*+/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\bArchive\b/g, '')
    .trim();
}

function isNarrativeLine(line) {
  const lowercase = line.toLowerCase();

  if (line.length < 40 || line.length > 260) {
    return false;
  }

  if (
    lowercase.includes('archive') ||
    lowercase.includes('associated press') ||
    lowercase.includes('from nba.com news services') ||
    lowercase.includes('steve aschburner') ||
    lowercase.includes('john schuhmann') ||
    lowercase.includes('injured') ||
    lowercase.includes('misses the earlier meeting') ||
    lowercase.includes('4th quarter') ||
    lowercase.includes('quarter of their loss') ||
    lowercase.includes('linescores') ||
    lowercase.includes('| q1 |') ||
    lowercase.includes('| q2 |') ||
    lowercase.includes('| q3 |') ||
    lowercase.includes('| q4 |') ||
    lowercase.includes('| final |') ||
    lowercase.includes('tickets') ||
    lowercase.includes('games home tickets') ||
    lowercase.includes('game recap') ||
    lowercase.includes('takeaways:') ||
    lowercase.includes('playoffs:') ||
    lowercase.includes('updated on') ||
    lowercase.includes('watch video') ||
    lowercase.includes('view series') ||
    lowercase.includes('league pass')
  ) {
    return false;
  }

  if (
    /^by\s+[A-Z]/.test(line) ||
    /^\d+\s+takeaways:/i.test(line) ||
    /^[A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+\s+Archive/.test(line)
  ) {
    return false;
  }

  return /[a-z]/.test(line);
}

function isUsableSentence(sentence) {
  const lowercase = sentence.toLowerCase();

  if (sentence.length < 40 || sentence.length > 220) {
    return false;
  }

  if (
    lowercase.includes('http') ||
    lowercase.includes('www.') ||
    lowercase.includes('](') ||
    lowercase.includes('| q1 |') ||
    lowercase.includes('| q2 |') ||
    lowercase.includes('| q3 |') ||
    lowercase.includes('| q4 |') ||
    lowercase.includes('| final |') ||
    lowercase.includes('linescores') ||
    lowercase.includes('tickets') ||
    lowercase.includes('league pass') ||
    lowercase.includes('customer support') ||
    lowercase.includes('privacy policy') ||
    lowercase.includes('accessibility page') ||
    lowercase.includes('social justice coalition') ||
    lowercase.includes('nba id benefits') ||
    lowercase.includes('playoffs schedule') ||
    lowercase.includes('game recap') ||
    lowercase.includes('archive') ||
    lowercase.includes('associated press') ||
    lowercase.includes('from nba.com news services') ||
    lowercase.includes('steve aschburner') ||
    lowercase.includes('john schuhmann') ||
    lowercase.includes('injured') ||
    lowercase.includes('4th quarter') ||
    lowercase.includes('quarter of their loss') ||
    lowercase.includes('series lead') ||
    lowercase.includes('earlier meeting') ||
    lowercase.includes('misses the earlier meeting') ||
    lowercase.includes('related') ||
    lowercase.includes('latest')
  ) {
    return false;
  }

  if (/^[A-Z\s|:0-9-]+$/.test(sentence)) {
    return false;
  }

  return /[a-z]/.test(sentence);
}

function isSentenceRelevantToGame(sentence, game) {
  const lowercase = sentence.toLowerCase();
  const homeTeam = game.homeTeam.toLowerCase();
  const awayTeam = game.awayTeam.toLowerCase();
  const homeShort = shortTeamName(game.homeTeam).toLowerCase();
  const awayShort = shortTeamName(game.awayTeam).toLowerCase();
  const city = cityFromTeam(game.homeTeam).toLowerCase();

  return (
    lowercase.includes(homeTeam) ||
    lowercase.includes(awayTeam) ||
    (homeShort && lowercase.includes(homeShort)) ||
    (awayShort && lowercase.includes(awayShort)) ||
    (city && lowercase.includes(city))
  );
}

function buildPlainScoreStory(game) {
  const winner =
    Number(game.homeScore || 0) > Number(game.awayScore || 0) ? game.homeTeam : game.awayTeam;
  const margin = Math.abs(Number(game.homeScore || 0) - Number(game.awayScore || 0));

  if (margin >= 20) {
    return `${shortTeamName(winner)} won comfortably on the final margin.`;
  }

  if (margin >= 10) {
    return `${shortTeamName(winner)} created enough separation to control the result.`;
  }

  return `${shortTeamName(winner)} held on in a relatively tight finish.`;
}

function sanitizeStoryline(sentence) {
  return sentence
    .replace(/^Knicks beat 76ers \d{2,3}-\d{2,3} behind Jalen Brunson, take a \d-\d series lead\s*/i, '')
    .replace(/^.*take a \d-\d series lead\s*/i, '')
    .replace(/^.*Game\s+[1-7]\s*/i, '')
    .replace(/^.*injured.*$/i, '')
    .replace(/\bGame\s+[1-7]\b/gi, 'the earlier meeting')
    .replace(/\btake a \d-\d series lead\b/gi, '')
    .replace(/\bseries lead\b/gi, '')
    .replace(/\bseries\b/gi, 'matchup')
    .replace(/\b4th quarter\b/gi, 'late stretch')
    .replace(/\bmisses the earlier meeting\b/gi, '')
    .replace(/\bquarter of their loss\b/gi, '')
    .replace(/\([^)]*\d+:\d+[^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,;:\-\s]+/, '')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()
    .replace(/^The\s+the\s+/i, 'The ')
    .replace(/^[a-z]/, (letter) => letter.toUpperCase())
    .replace(/([^.!?])$/, '$1.');
}

function polishGeneratedRecap(script) {
  return script
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\.\s+\./g, '.')
    .trim();
}

function detectUnrelatedTeamMentions(script, payload) {
  const text = script.toLowerCase();
  const allowedTeams = new Set();

  for (const game of payload.verifiedGameFacts ?? []) {
    allowedTeams.add(game.homeTeam.toLowerCase());
    allowedTeams.add(game.awayTeam.toLowerCase());
    allowedTeams.add(shortTeamName(game.homeTeam).toLowerCase());
    allowedTeams.add(shortTeamName(game.awayTeam).toLowerCase());
    for (const alias of aliasesForTeam(game.homeTeam)) {
      allowedTeams.add(alias);
    }
    for (const alias of aliasesForTeam(game.awayTeam)) {
      allowedTeams.add(alias);
    }
    const homeCity = cityFromTeam(game.homeTeam).toLowerCase();
    const awayCity = cityFromTeam(game.awayTeam).toLowerCase();
    if (homeCity) allowedTeams.add(homeCity);
    if (awayCity) allowedTeams.add(awayCity);
  }

  const warnings = [];
  for (const candidate of ALL_TEAM_TOKENS) {
    if (allowedTeams.has(candidate)) {
      continue;
    }

    if (candidate && text.includes(candidate)) {
      warnings.push(`Model output mentioned an unrelated team or market: ${candidate}`);
    }
  }

  return warnings;
}

const ALL_TEAM_TOKENS = [
  'atlanta hawks',
  'hawks',
  'boston celtics',
  'celtics',
  'brooklyn nets',
  'nets',
  'charlotte hornets',
  'hornets',
  'chicago bulls',
  'bulls',
  'cleveland cavaliers',
  'cavaliers',
  'cavs',
  'dallas mavericks',
  'mavericks',
  'denver nuggets',
  'nuggets',
  'detroit pistons',
  'pistons',
  'golden state warriors',
  'warriors',
  'houston rockets',
  'rockets',
  'indiana pacers',
  'pacers',
  'los angeles clippers',
  'clippers',
  'los angeles lakers',
  'lakers',
  'memphis grizzlies',
  'grizzlies',
  'miami heat',
  'heat',
  'milwaukee bucks',
  'bucks',
  'minnesota timberwolves',
  'timberwolves',
  'wolves',
  'new orleans pelicans',
  'pelicans',
  'new york knicks',
  'knicks',
  'oklahoma city thunder',
  'thunder',
  'orlando magic',
  'magic',
  'philadelphia 76ers',
  '76ers',
  'sixers',
  'phoenix suns',
  'suns',
  'portland trail blazers',
  'trail blazers',
  'blazers',
  'sacramento kings',
  'kings',
  'san antonio spurs',
  'spurs',
  'toronto raptors',
  'raptors',
  'utah jazz',
  'jazz',
  'washington wizards',
  'wizards',
  'atlanta',
  'boston',
  'brooklyn',
  'charlotte',
  'chicago',
  'cleveland',
  'dallas',
  'denver',
  'detroit',
  'golden state',
  'houston',
  'indiana',
  'los angeles',
  'memphis',
  'miami',
  'milwaukee',
  'minnesota',
  'new orleans',
  'new york',
  'oklahoma city',
  'orlando',
  'philadelphia',
  'phoenix',
  'portland',
  'sacramento',
  'san antonio',
  'toronto',
  'utah',
  'washington',
];

function cityFromTeam(teamName) {
  return teamName
    .replace(/\b(76ers|Knicks|Celtics|Lakers|Warriors|Spurs|Timberwolves|Suns|Mavericks|Bucks|Heat|Nuggets|Thunder|Cavaliers|Pacers|Pistons|Raptors|Nets|Bulls|Hawks|Hornets|Magic|Wizards|Clippers|Kings|Pelicans|Rockets|Grizzlies|Jazz|Trail Blazers)\b/g, '')
    .trim();
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

function aliasesForTeam(teamName) {
  const normalized = teamName.toLowerCase();

  if (normalized.includes('76ers')) {
    return ['76ers', 'sixers', 'philadelphia 76ers', 'philadelphia'];
  }

  if (normalized.includes('timberwolves')) {
    return ['timberwolves', 'wolves', 'minnesota timberwolves', 'minnesota'];
  }

  if (normalized.includes('cavaliers')) {
    return ['cavaliers', 'cavs', 'cleveland cavaliers', 'cleveland'];
  }

  if (normalized.includes('trail blazers')) {
    return ['trail blazers', 'blazers', 'portland trail blazers', 'portland'];
  }

  return [normalized, shortTeamName(teamName).toLowerCase(), cityFromTeam(teamName).toLowerCase()].filter(Boolean);
}
