import * as z from "zod";
import { createDeepAgent } from "deepagents";

import { getBusyWindows } from "../services/calendar.js";
import { getGamesForWindows } from "../services/nba.js";
import { findCoverageForGames } from "../services/nimble.js";
import {
  buildDeterministicRecapForTest,
  generatePodcastRecap,
  validateGeneratedRecap,
} from "../services/openai.js";
import { generatePodcastAudio } from "../services/audio.js";
import { decideNextAction } from "../agent.js";

const ContextAssessment = z.object({
  recommendation: z.enum(["skip", "notify"]),
  reason: z.string(),
});

const ScriptDraft = z.object({
  script: z.string(),
});

const FinalAgentResponse = z.object({
  script: z.string(),
  assistantReason: z.string(),
});

type RuntimeOptions = {
  from?: string;
  to?: string;
  generateAudio?: boolean;
  onProgress?: (message: string) => void;
};

export async function runDeepAgentWorkflow(config: any, options: RuntimeOptions = {}) {
  const report = options.onProgress ?? (() => {});

  report("Observing your recent schedule");
  const busyWindows = await getBusyWindows(config, options);
  report(`Found ${busyWindows.length} calendar event(s) in range`);

  report("Finding matching NBA games");
  const games = await getGamesForWindows(config, busyWindows, options);
  const context = { busyWindows, games, coverage: [] as any[] };
  const baseDecision = decideNextAction(config, context);

  if (!games.length) {
    return {
      context,
      decision: baseDecision,
      artifact: {
        script: "No overlapping NBA games were found in the selected calendar window.",
        audioPath: null,
        audioUrl: null,
        mode: "no-games",
        warnings: [],
      },
      busyWindows,
      games: [],
      coverage: [],
      diagnostics: {
        busyWindowsFound: busyWindows.length,
        busyMinutes: baseDecision.busyMinutes,
        gameMatchesFound: 0,
        sourcesFound: 0,
        extractErrors: 0,
        recapMode: "no-games",
        recapWarnings: [],
        assistantDecision: baseDecision.action,
        assistantReason: baseDecision.reason,
      },
      script: "No overlapping NBA games were found in the selected calendar window.",
      audioPath: null,
      audioUrl: null,
    };
  }

  report(`Found ${games.length} game(s), retrieving coverage with Nimble`);
  const coverage = await findCoverageForGames(config, games);
  context.coverage = coverage;

  const summaryPayload = {
    busyWindows,
    verifiedGameFacts: coverage.map((entry) => ({
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
      verifiedSourceNotes: entry.extracts.map((extract) => buildCompactSourceNote(extract)),
    })),
  };

  report("Running Deep Agents analysis and recap writing");
  const recap = await createRecapWithDeepAgents(config, summaryPayload, baseDecision);
  report(`Podcast script generated via ${recap.mode}`);

  const shouldGenerateAudio = options.generateAudio ?? Boolean(config.openAiApiKey);
  const warnings = [...recap.warnings];
  let audioAsset = { audioPath: null, audioUrl: null, blobPathname: null, storage: "none" };

  if (shouldGenerateAudio) {
    try {
      audioAsset = await generatePodcastAudio(config, recap.script);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Audio generation failed: ${message}`);
      report(`Audio unavailable: ${message}`);
    }
  }

  const audioPath = audioAsset.audioPath ?? null;
  const audioUrl =
    audioAsset.audioUrl ??
    (audioAsset.blobPathname ? toPrivateBlobAudioUrl(config, audioAsset.blobPathname) : null) ??
    (audioPath ? toPublicAudioUrl(config, audioPath) : null);
  if (audioPath) {
    report(`Audio written to ${audioPath}`);
  } else if (audioUrl) {
    report(`Audio uploaded to ${audioUrl}`);
  }

  const assistantReason =
    recap.assistantReason && baseDecision.action !== "skip"
      ? recap.assistantReason
      : baseDecision.reason;

  return {
    context: {
      busyWindows,
      games,
      coverage,
    },
    decision: {
      ...baseDecision,
      reason: assistantReason,
    },
    artifact: {
      script: recap.script,
      audioPath,
      audioUrl,
      mode: recap.mode,
      warnings,
    },
    busyWindows,
    games,
    coverage,
    diagnostics: {
      busyWindowsFound: busyWindows.length,
      busyMinutes: baseDecision.busyMinutes,
      gameMatchesFound: games.length,
      sourcesFound: coverage.reduce((count, entry) => count + entry.searchResults.length, 0),
      extractErrors: coverage.reduce((count, entry) => count + entry.errors.length, 0),
      recapMode: recap.mode,
      recapWarnings: warnings,
      assistantDecision: baseDecision.action,
      assistantReason,
    },
    script: recap.script,
    audioPath,
    audioUrl,
  };
}

async function createRecapWithDeepAgents(config: any, summaryPayload: any, baseDecision: any) {
  if (!config.openAiApiKey) {
    const fallback = await generatePodcastRecap(config, summaryPayload);
    return {
      script: fallback.script,
      assistantReason: baseDecision.reason,
      mode: fallback.mode,
      warnings: fallback.warnings,
    };
  }

  try {
    const agent = createDeepAgent({
      model: normalizeDeepAgentModel(config.openAiModel),
      systemPrompt:
        "You are a personal NBA recap assistant. Use the provided verified facts and cleaned research notes to decide whether the user missed meaningful NBA action and to write a polished podcast-style morning recap. Prefer direct game facts over broad playoff framing. Keep the tone energetic, concise, and natural.",
      subagents: [
        {
          name: "context_analyst",
          description:
            "Assesses whether the missed-game context is strong enough to justify interrupting the user with an update.",
          systemPrompt:
            "Review the busy window and game context. Return whether the assistant should skip or notify, along with a short reason.",
          responseFormat: ContextAssessment,
        },
        {
          name: "sportswriter",
          description:
            "Writes a polished podcast-style NBA morning recap grounded only in the provided fact pack and source notes.",
          systemPrompt:
            "Write a natural, energetic NBA recap. Use only the provided verified facts and source notes. Avoid unrelated teams. Do not mention web search or AI.",
          responseFormat: ScriptDraft,
        },
      ],
      responseFormat: FinalAgentResponse,
    });

    const result: any = await agent.invoke({
      messages: [
        {
          role: "user",
          content: [
            "Use the built-in planning and task delegation abilities to review the following NBA missed-game context.",
            "Consult the context analyst and sportswriter subagents before producing the final answer.",
            "Keep the final podcast recap under 300 words.",
            "",
            "Verified context and fact pack:",
            JSON.stringify(
              {
                decisionThreshold: {
                  defaultAction: baseDecision.action,
                  defaultReason: baseDecision.reason,
                },
                ...summaryPayload,
              },
              null,
              2,
            ),
          ].join("\n"),
        },
      ],
    });

    const structured = result?.structuredResponse;
    if (!structured?.script) {
      throw new Error("Deep Agents did not return a structured recap.");
    }

    const validation = validateGeneratedRecap(structured.script, summaryPayload);
    if (validation.hardWarnings.length) {
      return {
        script: buildDeterministicRecapForTest(summaryPayload),
        assistantReason: structured.assistantReason ?? baseDecision.reason,
        mode: "deterministic-validated-fallback",
        warnings: [...validation.hardWarnings, ...validation.softWarnings],
      };
    }

    return {
      script: structured.script.trim(),
      assistantReason: structured.assistantReason ?? baseDecision.reason,
      mode: validation.softWarnings.length ? "deepagents-with-warnings" : "deepagents",
      warnings: validation.softWarnings,
    };
  } catch (error) {
    const fallback = await generatePodcastRecap(config, summaryPayload);
    return {
      script: fallback.script,
      assistantReason: baseDecision.reason,
      mode: `fallback-after-deepagents-error:${fallback.mode}`,
      warnings: [
        `Deep Agents orchestration failed: ${error instanceof Error ? error.message : String(error)}`,
        ...fallback.warnings,
      ],
    };
  }
}

function normalizeDeepAgentModel(modelName: string) {
  return modelName.includes(":") ? modelName : `openai:${modelName}`;
}

function toPublicAudioUrl(config: any, audioPath: string) {
  const fileName = audioPath.split("/").pop();
  return `${config.publicBaseUrl.replace(/\/$/, "")}/output/${fileName}`;
}

function toPrivateBlobAudioUrl(config: any, pathname: string) {
  return `${config.publicBaseUrl.replace(/\/$/, "")}/api/audio?pathname=${encodeURIComponent(pathname)}`;
}

function buildCompactSourceNote(extract: any) {
  const brief = pickSourceBrief(extract.snippet, extract.extractedText);
  return {
    title: extract.title,
    source: extract.source,
    url: extract.url,
    snippet: brief,
    extractedText: "",
  };
}

function pickSourceBrief(snippet: string, extractedText: string) {
  const normalizedSnippet = cleanContextLine(snippet);
  if (normalizedSnippet) {
    return normalizedSnippet;
  }

  const candidates = String(extractedText ?? "")
    .split(/\n+/)
    .map((line) => cleanContextLine(line))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.length >= 50) {
      return candidate;
    }
  }

  return candidates[0] ?? "";
}

function cleanContextLine(value: string) {
  return String(value ?? "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[#*\-\s]+/, "")
    .replace(/\([^)]*\d+:\d+[^)]*\)/g, "")
    .trim()
    .slice(0, 260);
}
