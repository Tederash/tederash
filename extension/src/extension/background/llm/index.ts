import type { AiConfig } from '../../../shared/messages';
import { DirectLlmProvider } from './direct';
import { HeuristicLlmProvider } from './heuristic';
import type { LlmProvider } from './types';

const defaultGroqKey =
  typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? process.env.GROQ_API_KEY : '';

let currentConfig: AiConfig = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  apiKey: defaultGroqKey,
};

let cachedProvider: LlmProvider | null = defaultGroqKey
  ? new DirectLlmProvider({
      provider: 'groq',
      apiKey: defaultGroqKey,
      model: 'llama-3.3-70b-versatile',
    })
  : null;

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
