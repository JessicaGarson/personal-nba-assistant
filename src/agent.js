import { getBusyWindows } from './services/calendar.js';
import { getGamesForWindows } from './services/nba.js';
import { findCoverageForGames } from './services/nimble.js';
import { generatePodcastRecap } from './services/openai.js';
import { generatePodcastAudio } from './services/audio.js';

export async function runAgent(config, options = {}) {
  const report = options.onProgress ?? (() => {});

  report('Observing your recent schedule');
  const context = await observeContext(config, options, report);

  report('Deciding whether this is worth packaging as an update');
  const decision = decideNextAction(config, context);

  if (!context.games.length) {
    return buildEmptyResult(context, decision);
  }

  report('Creating the recap artifact');
  const artifact = await createRecapArtifact(config, context, options, report);

  return finalizeRun(config, context, decision, artifact);
}

export async function observeContext(config, options = {}, report = () => {}) {
  const busyWindows = await getBusyWindows(config, options);
  report(`Found ${busyWindows.length} calendar event(s) in range`);

  const games = await getGamesForWindows(config, busyWindows, options);
  if (!games.length) {
    return {
      busyWindows,
      games: [],
      coverage: [],
    };
  }

  report(`Found ${games.length} game(s), retrieving coverage with Nimble`);
  const coverage = await findCoverageForGames(config, games);

  return {
    busyWindows,
    games,
    coverage,
  };
}

export function decideNextAction(config, context) {
  const busyMinutes = totalBusyMinutes(context.busyWindows);
  const gameMatchesFound = context.games.length;
  const sourcesFound = context.coverage.reduce(
    (count, entry) => count + entry.searchResults.length,
    0,
  );
  const extractErrors = context.coverage.reduce((count, entry) => count + entry.errors.length, 0);

  if (gameMatchesFound < 1) {
    return {
      action: 'skip',
      shouldNotify: false,
      reason: 'No missed NBA games were found in the selected window.',
      busyMinutes,
      gameMatchesFound,
      sourcesFound,
      extractErrors,
    };
  }

  if (busyMinutes < config.assistantMinBusyMinutes) {
    return {
      action: 'skip',
      shouldNotify: false,
      reason:
        busyMinutes === 0
          ? 'No meaningful busy time was found in the selected window, so there was nothing to turn into a missed-games update.'
          : `The selected window only included about ${busyMinutes} busy minute${busyMinutes === 1 ? '' : 's'}, so the assistant skipped sending a missed-games update.`,
      busyMinutes,
      gameMatchesFound,
      sourcesFound,
      extractErrors,
    };
  }

  return {
    action: 'notify',
    shouldNotify: true,
    reason: 'Missed games were found during a meaningful busy window.',
    busyMinutes,
    gameMatchesFound,
    sourcesFound,
    extractErrors,
  };
}

export async function createRecapArtifact(config, context, options = {}, report = () => {}) {
  const summaryPayload = {
    busyWindows: context.busyWindows,
    verifiedGameFacts: context.coverage.map((entry) => ({
      gameId: entry.game.id,
      date: entry.game.startTime,
      matchup: entry.game.name,
      shortName: entry.game.shortName,
      status: entry.game.status,
      finalScore: entry.game.finalScore,
      homeTeam: entry.game.homeTeam,
      awayTeam: entry.game.awayTeam,
      homeScore: entry.game.homeScore,
      awayScore: entry.game.awayScore,
      isFavorite: entry.game.isFavorite,
      verifiedSourceNotes: entry.extracts.map((extract) => ({
        title: extract.title,
        source: extract.source,
        url: extract.url,
        snippet: extract.snippet,
        extractedText: extract.extractedText,
      })),
    })),
  };

  report('Generating podcast recap with OpenAI');
  const recap = await generatePodcastRecap(config, summaryPayload);
  report(`Podcast script generated via ${recap.mode}`);

  const shouldGenerateAudio = options.generateAudio ?? Boolean(config.openAiApiKey);
  const audioPath = shouldGenerateAudio ? await generatePodcastAudio(config, recap.script) : null;
  const audioUrl = audioPath ? toPublicAudioUrl(config, audioPath) : null;
  if (audioPath) {
    report(`Audio written to ${audioPath}`);
  }

  return {
    script: recap.script,
    audioPath,
    audioUrl,
    mode: recap.mode,
    warnings: recap.warnings,
  };
}

function buildEmptyResult(context, decision) {
  const message = 'No overlapping NBA games were found in the selected calendar window.';
  return {
    context,
    decision,
    artifact: {
      script: message,
      audioPath: null,
      audioUrl: null,
      mode: 'no-games',
      warnings: [],
    },
    busyWindows: context.busyWindows,
    games: [],
    coverage: [],
    diagnostics: {
      busyWindowsFound: context.busyWindows.length,
      busyMinutes: decision.busyMinutes,
      gameMatchesFound: 0,
      sourcesFound: 0,
      extractErrors: 0,
      recapMode: 'no-games',
      recapWarnings: [],
      assistantDecision: decision.action,
      assistantReason: decision.reason,
    },
    script: message,
    audioPath: null,
    audioUrl: null,
  };
}

function finalizeRun(config, context, decision, artifact) {
  return {
    context,
    decision,
    artifact,
    busyWindows: context.busyWindows,
    games: context.games,
    coverage: context.coverage,
    diagnostics: {
      busyWindowsFound: context.busyWindows.length,
      busyMinutes: decision.busyMinutes,
      gameMatchesFound: decision.gameMatchesFound,
      sourcesFound: decision.sourcesFound,
      extractErrors: decision.extractErrors,
      recapMode: artifact.mode,
      recapWarnings: artifact.warnings,
      assistantDecision: decision.action,
      assistantReason: decision.reason,
    },
    script: artifact.script,
    audioPath: artifact.audioPath,
    audioUrl: artifact.audioUrl,
  };
}

function toPublicAudioUrl(config, audioPath) {
  const fileName = audioPath.split('/').pop();
  return `${config.publicBaseUrl.replace(/\/$/, '')}/output/${fileName}`;
}

function totalBusyMinutes(busyWindows) {
  return Math.round(
    busyWindows.reduce((total, event) => {
      const start = new Date(event.start).getTime();
      const end = new Date(event.end).getTime();
      return total + Math.max(0, end - start);
    }, 0) / 60000,
  );
}
