import { getConfig } from './config.js';
import { runSendWorkflow } from './run-send-workflow.js';

const config = getConfig();

try {
  console.error('[assistant] Observing schedule and missed-game context');
  const { result, delivery } = await runSendWorkflow(config, {
    onProgress: (message) => console.error(`[assistant] ${message}`),
  });
  console.error(`[assistant] Decision: ${result.decision.reason}`);
  console.log(
    JSON.stringify(
      {
        action: result.decision.action,
        delivered: delivery.delivered,
        destination: delivery.destination ?? null,
        reason: delivery.reason ?? null,
        audioUrl: result.audioUrl ?? null,
        diagnostics: result.diagnostics,
        script: result.script,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('[assistant] Run failed');
  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
  process.exitCode = 1;
}
