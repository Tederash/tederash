import type { AiConfig } from '../../../shared/messages';
import { DirectLlmProvider } from './direct';
import { HeuristicLlmProvider } from './heuristic';
import type { LlmProvider } from './types';

let cachedProvider: LlmProvider | null = null;
let currentConfig: AiConfig = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
};

export function setAiConfig(config: AiConfig): LlmProvider {
  currentConfig = config;
  if (config.provider !== 'heuristic' && config.apiKey && config.apiKey.trim().length > 0) {
    cachedProvider = new DirectLlmProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model || (config.provider === 'groq' ? 'llama-3.3-70b-versatile' : undefined),
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
