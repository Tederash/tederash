# ADR-004: Tederash Branding and Groq Default Cloud LLM Provider

## Status
Accepted

## Context
`AGENTS.MD` used "Aura" as a placeholder working name and left the default BYOK cloud LLM provider open among OpenAI, Anthropic, and custom proxies.

## Decision
1. Official product name is **Tederash** (configured via `public/_locales/en/messages.json` and UI copy). DOM attributes and injected style markers use the `tederash-` / `data-tederash-` prefix (e.g., `<style id="tederash-style">`, `html[data-tederash-scale]`).
2. Behind the vendor-neutral `LlmProvider` interface (`src/extension/background/llm/provider.ts`), **Groq** (`https://api.groq.com/openai/v1/chat/completions`, OpenAI-compatible tool-calling & streaming SSE) is the primary cloud BYOK provider adapter, alongside Chrome built-in on-device AI (`chrome-builtin`) and extensible adapters for OpenAI/Anthropic/proxy.

## Consequences
- Manifest `optional_host_permissions` includes `https://api.groq.com/*`.
- Ultra-low-latency streaming inference for voice/agentic workflows while keeping the agent core strictly provider-agnostic.
