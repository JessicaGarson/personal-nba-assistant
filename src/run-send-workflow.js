import { runDeepAgentWorkflow } from './deepagents/runtime.ts';
import { deliverRecap } from './services/delivery.js';

export async function runSendWorkflow(config, options = {}) {
  const result = await runDeepAgentWorkflow(config, {
    generateAudio: true,
    onProgress: options.onProgress,
  });

  const delivery = await deliverRecap(config, result);

  return {
    result,
    delivery,
  };
}
