import { getConfig, splitCsv } from './config.js';
import { runDeepAgentWorkflow } from './deepagents/runtime.ts';

const config = getConfig();
const args = parseArgs(process.argv.slice(2));

try {
  const runConfig = {
    ...config,
    favoriteTeams: args.teams?.length ? splitCsv(args.teams) : config.favoriteTeams,
  };

  console.error('[agent] Live mode enabled');
  console.error(
    `[agent] Calendar configured: ${Boolean(runConfig.calendarIcsUrl)} | Nimble configured: ${Boolean(runConfig.nimbleApiKey)} | OpenAI configured: ${Boolean(runConfig.openAiApiKey)}`,
  );

  const result = await runDeepAgentWorkflow(runConfig, {
    from: args.from,
    to: args.to,
    generateAudio: args.audio ?? Boolean(runConfig.openAiApiKey),
    onProgress: (message) => {
      console.error(`[agent] ${message}`);
    },
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printSummary(result);
  }
} catch (error) {
  console.error('[agent] Run failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const flags = {};

  for (const value of argv) {
    if (value === '--audio') {
      flags.audio = true;
      continue;
    }

    if (value === '--json') {
      flags.json = true;
      continue;
    }

    const [key, raw] = value.split('=');
    if (!raw) {
      continue;
    }

    if (key === '--from') {
      flags.from = raw;
    } else if (key === '--to') {
      flags.to = raw;
    } else if (key === '--teams') {
      flags.teams = raw;
    }
  }

  return flags;
}

function printSummary(result) {
  const lines = [
    '',
    'NBA Podcast Recap',
    '',
    `Games found: ${result.games.length}`,
    result.audioUrl ? `Audio: ${result.audioUrl}` : 'Audio: not generated',
    '',
    'Games:',
  ];

  for (const game of result.games) {
    lines.push(`- ${game.shortName}${game.finalScore ? ` | ${game.finalScore}` : ''}`);
  }

  lines.push('', 'Script:', result.script);
  console.log(lines.join('\n'));
}
