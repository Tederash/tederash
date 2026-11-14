import React, { useEffect, useRef, useState } from 'react';
import { createEnvelope } from '../../shared/envelope';
import type { AiConfig, ChatMessage } from '../../shared/messages';
import { Button } from '../ui/Button';

export function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTabInfo, setActiveTabInfo] = useState<{ id?: number; title?: string; url?: string }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AiConfig>({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState('llama-3.3-70b-versatile');

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
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const currentTab = tabs[0];
          if (currentTab && currentTab.id !== undefined) {
            setActiveTabInfo({
              id: currentTab.id,
              title: currentTab.title,
              url: currentTab.url,
            });
          }
        }

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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
            setApiKeyInput(configRes.config.apiKey || '');
            setModelInput(configRes.config.model || '');
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

    if (
      (aiConfig.provider === 'groq' || aiConfig.provider === 'openai') &&
      (!aiConfig.apiKey || !aiConfig.apiKey.trim())
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
          content: `⚙️ **${aiConfig.provider.toUpperCase()} API key required.** Click **⚙️ Model** in the top header, paste your API key, and click **Save Config**.\n\n*(Tip: Switch to **Built-in Deterministic** to test actions without any API key).*`,
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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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
        }, 800);
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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        await chrome.runtime.sendMessage(createEnvelope('agent/stop', {}));
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        await chrome.runtime.sendMessage(createEnvelope('agent/clearHistory', {}));
      }
      setMessages([]);
    } catch {
      // Ignore
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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
    'Find the search or login bar',
    'Scroll down',
  ];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg text-fg font-sans">
      {/* Header */}
      <header className="p-3 border-b border-border bg-surface flex items-center justify-between gap-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-fg">Tederash Assistant</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-accent/15 text-accent border border-accent/20 truncate"
              title={`Provider: ${aiConfig.provider} (${aiConfig.model || 'default'})`}
            >
              {aiConfig.provider === 'groq'
                ? 'GROQ (Llama 3.3)'
                : aiConfig.provider === 'heuristic'
                  ? 'Built-in (Fast)'
                  : aiConfig.provider.toUpperCase()}
            </span>
          </div>
          {activeTabInfo.title && (
            <span className="text-xs text-fg-muted truncate" title={activeTabInfo.url}>
              {activeTabInfo.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="AI Settings"
            title="Configure AI model & API key"
            className="p-1.5 text-fg-muted hover:text-fg rounded hover:bg-surface-elevated transition-colors text-xs"
          >
            ⚙️ Model
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Clear chat conversation"
              title="Clear chat history"
              className="p-1.5 text-fg-muted hover:text-danger rounded hover:bg-surface-elevated transition-colors text-xs"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </header>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <section
          aria-label="AI Provider Settings"
          className="p-3 border-b border-border bg-surface-elevated text-sm flex flex-col gap-2 shrink-0 animate-in fade-in"
        >
          <div className="font-semibold text-xs text-fg uppercase tracking-wider">
            AI Provider Configuration
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ai-provider" className="text-xs text-fg-muted">
              Provider Engine:
            </label>
            <select
              id="ai-provider"
              value={aiConfig.provider}
              onChange={(e) => {
                const nextProvider = e.target.value as AiConfig['provider'];
                setAiConfigState((prev) => ({
                  ...prev,
                  provider: nextProvider,
                  model: nextProvider === 'groq' ? 'llama-3.3-70b-versatile' : prev.model,
                }));
                if (nextProvider === 'groq') {
                  setModelInput('llama-3.3-70b-versatile');
                }
              }}
              className="p-1.5 rounded border border-border bg-bg text-fg text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="groq">Groq (Llama 3.3 70B - Recommended)</option>
              <option value="heuristic">Built-in Deterministic (No Key Needed)</option>
              <option value="gemini">Google Gemini (OpenAI-compatible)</option>
              <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
              <option value="custom">Custom / Local LLM (Ollama / Proxy)</option>
            </select>
          </div>

          {aiConfig.provider === 'groq' && (
            <p className="text-[11px] text-fg-muted">
              Groq provides sub-second tool-calling inference. Get a free API key at{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                console.groq.com
              </a>
              .
            </p>
          )}

          {aiConfig.provider !== 'heuristic' && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="ai-apikey" className="text-xs text-fg-muted">
                  {aiConfig.provider === 'groq' ? 'Groq API Key (gsk_...):' : 'API Key:'}
                </label>
                <input
                  id="ai-apikey"
                  type="password"
                  placeholder={aiConfig.provider === 'groq' ? 'gsk_...' : 'Enter your API key'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="p-1.5 rounded border border-border bg-bg text-fg text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="ai-model" className="text-xs text-fg-muted">
                  Model Override (optional):
                </label>
                <input
                  id="ai-model"
                  type="text"
                  placeholder={
                    aiConfig.provider === 'groq'
                      ? 'llama-3.3-70b-versatile'
                      : aiConfig.provider === 'gemini'
                        ? 'gemini-1.5-flash'
                        : 'gpt-4o-mini'
                  }
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="p-1.5 rounded border border-border bg-bg text-fg text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button size="compact" variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button size="compact" variant="primary" onClick={handleSaveConfig}>
              Save Config
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
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto text-center gap-3 p-4">
            <div className="text-3xl">✨</div>
            <h2 className="font-bold text-base text-fg">How can I help you today?</h2>
            <p className="text-xs text-fg-muted max-w-[280px]">
              I can inspect this page, adapt text size and contrast, read sections aloud, or guide you
              through actions.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-elevated text-fg transition-colors text-left"
                >
                  {sug}
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
                <div className="p-3 rounded-2xl rounded-tr-sm bg-accent text-accent-fg text-sm leading-relaxed shadow-sm">
                  {m.content}
                </div>
              ) : m.role === 'step' ? (
                <div
                  className={`text-xs px-2.5 py-1.5 rounded border my-0.5 flex items-center gap-2 max-w-full ${
                    m.status === 'error'
                      ? 'border-danger/30 bg-danger/10 text-danger'
                      : 'border-border bg-surface text-fg-muted'
                  }`}
                >
                  <span className="shrink-0">{m.status === 'error' ? '⚠️' : '⚡'}</span>
                  <span className="truncate">{m.content}</span>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed border shadow-sm ${
                    m.status === 'error'
                      ? 'border-danger/40 bg-danger/10 text-danger'
                      : 'border-border bg-surface text-fg'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              )}
              <span className="text-[10px] text-fg-muted px-1 mt-0.5">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {isRunning && (
          <div className="self-start flex items-center gap-2 text-xs text-fg-muted p-2 rounded-lg bg-surface border border-border animate-pulse">
            <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping" />
            <span>Observing page & reasoning…</span>
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
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder="Ask Tederash or type a command... (Enter to send)"
              aria-label="Message prompt for accessibility assistant"
              className="w-full p-2.5 rounded-lg border border-border bg-bg text-fg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>

          {isRunning ? (
            <Button
              type="button"
              variant="danger"
              size="default"
              onClick={handleStop}
              aria-label="Stop running task"
              title="Stop task (Esc)"
            >
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="default"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              Send
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
