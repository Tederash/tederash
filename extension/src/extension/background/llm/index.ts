import type { AiConfig } from '../../../shared/messages';
import { DirectLlmProvider } from './direct';
import { HeuristicLlmProvider } from './heuristic';
import type { LlmProvider } from './types';

let cachedProvider: LlmProvider | null = null;
let currentConfig: AiConfig = { provider: 'heuristic' };

export function setAiConfig(config: AiConfig): LlmProvider {
  currentConfig = config;
  if (config.provider !== 'heuristic' && config.apiKey && config.apiKey.trim().length > 0) {
    cachedProvider = new DirectLlmProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
  } else {
    cachedProvider = new HeuristicLlmProvider();
  }
  return cachedProvider;
}

export function getAiConfig(): AiConfig {
  return currentConfig;
}

export function getActiveProvider(): LlmProvider {
  if (!cachedProvider) {
    cachedProvider = new HeuristicLlmProvider();
  }
  return cachedProvider;
}
