import React, { useEffect, useRef, useState } from 'react';
import { createEnvelope } from '../../shared/envelope';
import type { AiConfig, ChatMessage } from '../../shared/messages';
import { Button } from '../ui/Button';

const envGroqKey =
  typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? process.env.GROQ_API_KEY : '';
const envGroqModel =
  typeof process !== 'undefined' && process.env?.GROQ_MODEL ? process.env.GROQ_MODEL : 'openai/gpt-oss-120b';

export function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTabInfo, setActiveTabInfo] = useState<{ id?: number; title?: string; url?: string }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AiConfig>({
    provider: 'groq',
    model: envGroqModel,
    apiKey: envGroqKey,
  });
  const [apiKeyInput, setApiKeyInput] = useState(envGroqKey);
  const [modelInput, setModelInput] = useState(envGroqModel);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isRunning]);

  // Load active tab info, history, and AI config on mount
  useEffect(() => {
    async function init() {
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const currentTab = tabs[0];
          if (currentTab?.id !== undefined) {
            setActiveTabInfo({
              id: currentTab.id,
              title: currentTab.title,
              url: currentTab.url,
            });
          }
        }

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          // Load conversation history
          const historyRes = (await chrome.runtime.sendMessage(
            createEnvelope('agent/getHistory', {})
          )) as { ok: boolean; messages?: ChatMessage[] };
          if (historyRes?.ok && Array.isArray(historyRes.messages)) {
            setMessages(historyRes.messages);
          }

          // Load AI config
          const configRes = (await chrome.runtime.sendMessage(
            createEnvelope('ai/getConfig', {})
          )) as { ok: boolean; config?: AiConfig };
          if (configRes?.ok && configRes.config) {
            setAiConfigState(configRes.config);
            setApiKeyInput(configRes.config.apiKey || envGroqKey);
            setModelInput(configRes.config.model || 'llama-3.3-70b-versatile');
          }
        }
      } catch {
        // Fallback for mock/dev environment
      }
    }
    void init();
  }, []);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isRunning) return;

    if (!customText) {
      setInput('');
    }

    const effectiveKey = aiConfig.apiKey || envGroqKey;

    if (
      (aiConfig.provider === 'groq' || aiConfig.provider === 'openai') &&
      (!effectiveKey || !effectiveKey.trim())
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: `usr_${Date.now()}`,
          role: 'user',
          content: textToSend,
          timestamp: Date.now(),
        },
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: `API key required for ${aiConfig.provider.toUpperCase()}. Please configure your key in settings or add GROQ_API_KEY in .env.`,
          timestamp: Date.now(),
          status: 'error',
        },
      ]);
      setShowSettings(true);
      return;
    }

    const tabId = activeTabInfo.id ?? 1;

    // Optimistically append user message to UI
    const tempUserMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsRunning(true);

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = (await chrome.runtime.sendMessage(
          createEnvelope('agent/chat', {
            tabId,
            text: textToSend,
          })
        )) as { ok: boolean; messages?: ChatMessage[]; status?: string; error?: string };

        if (response?.ok && Array.isArray(response.messages)) {
          setMessages(response.messages);
        } else if (response?.error) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err_${Date.now()}`,
              role: 'assistant',
              content: `Error: ${response.error}`,
              timestamp: Date.now(),
              status: 'error',
            },
          ]);
        }
      } else {
        // Dev fallback simulation
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `sim_${Date.now()}`,
              role: 'assistant',
              content: `Dev mode response: Analyzed "${textToSend}".`,
              timestamp: Date.now(),
            },
          ]);
          setIsRunning(false);
        }, 600);
        return;
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Communication error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
          status: 'error',
        },
      ]);
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleStop = async () => {
    if (!isRunning) return;
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage(createEnvelope('agent/stop', {}));
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage(createEnvelope('agent/clearHistory', {}));
      }
      setMessages([]);
    } catch {
      // Ignore
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = (await chrome.runtime.sendMessage(
          createEnvelope('ai/setConfig', {
            provider: aiConfig.provider,
            apiKey: apiKeyInput.trim() || undefined,
            model: modelInput.trim() || undefined,
          })
        )) as { ok: boolean; config?: AiConfig };
        if (res?.ok && res.config) {
          setAiConfigState(res.config);
        }
      }
      setShowSettings(false);
    } catch {
      setShowSettings(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const suggestions = [
    'Summarize this page',
    'Increase text size & contrast',
    'Read the main content aloud',
    'Find search or navigation bar',
    'Scroll down',
  ];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg text-fg font-sans antialiased select-none">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm tracking-tight text-fg">Tederash</h1>
            <span
              className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-elevated text-fg-muted border border-border shrink-0"
              title={`Provider: ${aiConfig.provider} (${aiConfig.model || 'default'})`}
            >
              {aiConfig.provider === 'groq'
                ? `groq/${(aiConfig.model || envGroqModel).replace(/^.*\//, '')}`
                : aiConfig.provider === 'heuristic'
                  ? 'deterministic'
                  : aiConfig.provider}
            </span>
          </div>
          {activeTabInfo.title && (
            <span className="text-xs text-fg-muted truncate mt-0.5" title={activeTabInfo.url}>
              {activeTabInfo.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Settings"
            title="Configure AI model & API key"
            className="px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg rounded-md border border-border hover:bg-surface-elevated transition-colors"
          >
            Settings
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Clear chat conversation"
              title="Clear chat history"
              className="px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-danger rounded-md border border-border hover:bg-surface-elevated transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <section
          aria-label="AI Provider Settings"
          className="p-4 border-b border-border bg-surface-elevated text-sm flex flex-col gap-3 shrink-0"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-xs text-fg">AI Configuration</span>
            {envGroqKey && (
              <span className="text-[11px] text-success font-mono">.env key detected</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-provider" className="text-xs font-medium text-fg-muted">
              Provider
            </label>
            <select
              id="ai-provider"
              value={aiConfig.provider}
              onChange={(e) => {
                const nextProvider = e.target.value as AiConfig['provider'];
                setAiConfigState((prev) => ({
                  ...prev,
                  provider: nextProvider,
                  model: nextProvider === 'groq' ? envGroqModel : prev.model,
                }));
                if (nextProvider === 'groq') {
                  setModelInput(envGroqModel);
                }
              }}
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="groq">Groq (Auto-discovered / 120B Reasoning)</option>
              <option value="heuristic">Built-in Deterministic (No Key Needed)</option>
              <option value="gemini">Google Gemini (OpenAI-compatible)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="custom">Custom Endpoint / Local LLM</option>
            </select>
          </div>

          {aiConfig.provider !== 'heuristic' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-apikey" className="text-xs font-medium text-fg-muted">
                  API Key
                </label>
                <input
                  id="ai-apikey"
                  type="password"
                  placeholder={
                    envGroqKey && aiConfig.provider === 'groq'
                      ? '•••••••• (Loaded from .env)'
                      : aiConfig.provider === 'groq'
                        ? 'gsk_...'
                        : 'API Key'
                  }
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-model" className="text-xs font-medium text-fg-muted">
                  Model Override (optional)
                </label>
                <input
                  id="ai-model"
                  type="text"
                  placeholder={envGroqModel}
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button size="compact" variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button size="compact" variant="primary" onClick={handleSaveConfig}>
              Save
            </Button>
          </div>
        </section>
      )}

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation history"
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 select-text"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto text-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full border border-border bg-surface-elevated flex items-center justify-center text-sm font-mono font-medium text-fg">
              AI
            </div>
            <h2 className="font-semibold text-sm text-fg tracking-tight">How can I assist you with this page?</h2>
            <p className="text-xs text-fg-muted max-w-[280px] leading-relaxed">
              Ask questions about the content, adapt visual contrast, or navigate and interact.
            </p>
            <div className="flex flex-col gap-1.5 w-full max-w-[280px] mt-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="text-xs px-3 py-2 rounded-md border border-border bg-surface hover:bg-surface-elevated text-fg transition-colors text-left flex items-center justify-between"
                >
                  <span>{sug}</span>
                  <span className="text-fg-muted text-[10px]">↵</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[88%] ${
                m.role === 'user'
                  ? 'self-end items-end'
                  : 'self-start items-start'
              }`}
            >
              {m.role === 'user' ? (
                <div className="px-3.5 py-2.5 rounded-lg bg-accent text-accent-fg text-sm leading-relaxed shadow-xs">
                  {m.content}
                </div>
              ) : m.role === 'step' ? (
                <div
                  className={`text-xs px-2.5 py-1.5 rounded-md border my-0.5 font-mono flex items-center gap-2 max-w-full ${
                    m.status === 'error'
                      ? 'border-danger/30 bg-danger/10 text-danger'
                      : 'border-border bg-surface-elevated text-fg-muted'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-fg-muted">Action</span>
                  <span className="truncate">{m.content}</span>
                </div>
              ) : (
                <div
                  className={`px-3.5 py-2.5 rounded-lg text-sm leading-relaxed border shadow-xs ${
                    m.status === 'error'
                      ? 'border-danger/40 bg-danger/10 text-danger'
                      : 'border-border bg-surface text-fg'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              )}
              <span className="text-[10px] text-fg-muted px-1 mt-1 font-mono">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {isRunning && (
          <div className="self-start flex items-center gap-2 text-xs font-mono text-fg-muted px-3 py-2 rounded-md bg-surface-elevated border border-border">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <span>Reasoning & executing…</span>
          </div>
        )}
      </div>

      {/* Input Tray */}
      <footer className="p-3 border-t border-border bg-surface shrink-0 flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder="Ask Tederash or type an action... (Press Enter to send)"
              aria-label="Message prompt for assistant"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-fg placeholder:text-fg-muted text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg-muted font-mono">
              Enter to send · Shift+Enter for newline
            </span>
            {isRunning ? (
              <Button
                type="button"
                variant="danger"
                size="compact"
                onClick={handleStop}
                aria-label="Stop running task"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="compact"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                Send
              </Button>
            )}
          </div>
        </form>
      </footer>
    </div>
  );
}
