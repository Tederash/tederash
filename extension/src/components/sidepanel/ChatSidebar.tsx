import React, { useEffect, useRef, useState } from 'react';
import { createEnvelope } from '../../shared/envelope';
import type { AgentStreamEvent, AiConfig, ChatMessage } from '../../shared/messages';
import { Button } from '../ui/Button';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { ThoughtProcess } from './ThoughtProcess';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTabInfo, setActiveTabInfo] = useState<{ id?: number; title?: string; url?: string }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AiConfig>({
    provider: 'groq',
    model: DEFAULT_MODEL,
  });
  // The background never sends the saved key back; an empty input keeps it.
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(DEFAULT_MODEL);
  const [tederashState, setTederashState] = useState<{
    checked: boolean;
    isTederash: boolean;
    version?: string;
    profile?: string;
    locale?: string;
    tabTitle?: string;
    tabUrl?: string;
    tabId?: number;
  }>({
    checked: false,
    isTederash: false,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activePortRef = useRef<chrome.runtime.Port | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    Extract<AgentStreamEvent, { type: 'confirm_request' }> | null
  >(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Screen-reader announcements: the transcript itself is not a live region (it would
  // read every streamed token); status changes are debounced, answers read once.
  const [announcement, setAnnouncement] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = (text: string, debounceMs = 0) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
    if (debounceMs > 0) {
      statusTimerRef.current = setTimeout(() => setAnnouncement(text), debounceMs);
    } else {
      setAnnouncement(text);
    }
  };

  // Move focus to the confirmation so keyboard and screen-reader users notice it.
  useEffect(() => {
    if (pendingConfirm) confirmRef.current?.focus();
  }, [pendingConfirm]);

  const answerConfirm = (approved: boolean) => {
    if (!pendingConfirm) return;
    try {
      activePortRef.current?.postMessage({ type: 'agent/confirm', id: pendingConfirm.id, approved });
    } catch {
      // Port closed: the background treats a missing answer as "not confirmed".
    }
    setPendingConfirm(null);
    inputRef.current?.focus();
  };

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isRunning]);

  const verifyActiveTab = async (tabIdOverride?: number) => {
    try {
      let currentTabId = tabIdOverride;
      let currentTitle = '';
      let currentUrl = '';

      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
          tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        }
        const t = tabs[0];
        if (t?.id !== undefined) {
          currentTabId = currentTabId ?? t.id;
          currentTitle = t.title || '';
          currentUrl = t.url || '';
          setActiveTabInfo({ id: t.id, title: t.title, url: t.url });
        }
      }

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = (await chrome.runtime.sendMessage(
          createEnvelope('tab/checkTederash', { tabId: currentTabId })
        )) as {
          ok: boolean;
          isTederash: boolean;
          tederashVersion?: string;
          tederashProfile?: string;
          tederashLocale?: string;
          url?: string;
          tabId?: number;
        };

        if (res?.ok && res.isTederash) {
          setTederashState({
            checked: true,
            isTederash: true,
            version: res.tederashVersion,
            profile: res.tederashProfile,
            locale: res.tederashLocale,
            tabTitle: currentTitle,
            tabUrl: currentUrl || res.url,
            tabId: currentTabId,
          });
          return;
        }
      }

      setTederashState({
        checked: true,
        isTederash: false,
        tabTitle: currentTitle,
        tabUrl: currentUrl,
        tabId: currentTabId,
      });
    } catch {
      setTederashState({
        checked: true,
        isTederash: false,
      });
    }
  };

  // Load active tab info, history, AI config, and listen for tab switches
  useEffect(() => {
    async function init() {
      try {
        await verifyActiveTab();

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
            setApiKeyInput('');
            setModelInput(configRes.config.model || DEFAULT_MODEL);
          }
        }
      } catch {
        // Fallback for mock/dev environment
      }
    }
    void init();

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const handleActivated = (activeInfo: { tabId: number }) => {
        void verifyActiveTab(activeInfo.tabId);
      };

      const handleUpdated = (
        tabId: number,
        changeInfo: { status?: string },
        tab: { active?: boolean }
      ) => {
        if (changeInfo.status === 'complete' && tab.active) {
          void verifyActiveTab(tabId);
        }
      };

      chrome.tabs.onActivated?.addListener(handleActivated as any);
      chrome.tabs.onUpdated?.addListener(handleUpdated as any);

      return () => {
        chrome.tabs.onActivated?.removeListener(handleActivated as any);
        chrome.tabs.onUpdated?.removeListener(handleUpdated as any);
      };
    }
  }, []);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isRunning) return;

    if (!customText) {
      setInput('');
    }

    if (
      (aiConfig.provider === 'groq' || aiConfig.provider === 'openai') &&
      aiConfig.hasApiKey === false
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

    // Optimistically append user message & live assistant message placeholder
    const userMsgId = `usr_${Date.now()}`;
    const asstMsgId = `asst_${Date.now()}`;

    const tempUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };
    const liveAsstMsg: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'running',
      toolCalls: [],
      activeVerb: 'Analyzing request...',
    };

    setMessages((prev) => [...prev, tempUserMsg, liveAsstMsg]);
    setIsRunning(true);

    // Prefer Chrome Extension Port streaming for live rationales and token streaming
    if (typeof chrome !== 'undefined' && typeof chrome.runtime?.connect === 'function') {
      try {
        const port = chrome.runtime.connect({ name: 'agent-stream' });
        activePortRef.current = port;

        port.onMessage.addListener((event: AgentStreamEvent) => {
          if (event.type === 'confirm_request') {
            setPendingConfirm(event);
            announce(`Confirmation needed. ${event.title} ${event.detail}`);
            return;
          }
          if (event.type === 'thought') announce(event.activeVerb, 1000);
          if (event.type === 'done') setPendingConfirm(null);
          if (event.type === 'tool_call') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== asstMsgId) return m;
                const existing = m.toolCalls || [];
                const idx = existing.findIndex((tc) => tc.id === event.toolCall.id);
                const updated =
                  idx >= 0
                    ? existing.map((tc, i) => (i === idx ? event.toolCall : tc))
                    : [...existing, event.toolCall];
                return {
                  ...m,
                  toolCalls: updated,
                  activeVerb: event.toolCall.rationale
                    ? event.toolCall.rationale.split(' ')[0] + '...'
                    : m.activeVerb,
                };
              })
            );
          } else if (event.type === 'thought') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId ? { ...m, activeVerb: event.activeVerb } : m
              )
            );
          } else if (event.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== asstMsgId) return m;
                const existing = m.toolCalls || [];
                const updated = existing.map((tc) =>
                  tc.id === event.id
                    ? { ...tc, status: event.status, summary: event.summary }
                    : tc
                );
                return { ...m, toolCalls: updated };
              })
            );
          } else if (event.type === 'token') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? {
                      ...m,
                      content: m.content + event.token,
                      activeVerb: 'Cooking answer...',
                    }
                  : m
              )
            );
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? {
                      ...m,
                      status: 'error',
                      content: m.content || `Error: ${event.error}`,
                    }
                  : m
              )
            );
            setIsRunning(false);
          } else if (event.type === 'done') {
            // The background's final message is authoritative (status and full text).
            const final = [...(event.messages ?? [])].reverse().find((m) => m.role === 'assistant');
            const finalContent = final?.content || 'Task completed.';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? {
                      ...m,
                      status: final?.status === 'error' ? 'error' : 'success',
                      content: final?.content || m.content || 'Task completed.',
                    }
                  : m
              )
            );
            announce(finalContent.replace(/[*_`#>|]/g, '').slice(0, 400));
            setIsRunning(false);
            activePortRef.current = null;
            inputRef.current?.focus();
          }
        });

        port.onDisconnect.addListener(() => {
          setPendingConfirm(null);
          setIsRunning(false);
          activePortRef.current = null;
        });

        port.postMessage({
          type: 'agent/stream/start',
          tabId,
          text: textToSend,
        });
        return;
      } catch (err) {
        console.warn('Port streaming failed, falling back to unary messaging:', err);
      }
    }

    // Unary messaging fallback
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
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? {
                    ...m,
                    status: 'error',
                    content: `Error: ${response.error}`,
                  }
                : m
            )
          );
        }
      } else {
        // Dev fallback simulation
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? {
                    ...m,
                    status: 'success',
                    content: `Dev mode response: Analyzed "${textToSend}".`,
                  }
                : m
            )
          );
          setIsRunning(false);
        }, 600);
        return;
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                status: 'error',
                content: `Communication error: ${err instanceof Error ? err.message : String(err)}`,
              }
            : m
        )
      );
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleStop = async () => {
    if (!isRunning) return;
    try {
      if (activePortRef.current) {
        activePortRef.current.disconnect();
        activePortRef.current = null;
      }
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
    'Inspect Tederash form fields',
    'Switch to low-vision profile',
    'Simplify instructions and language',
    'Scan accessibility layout',
    'Explain required fields',
  ];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg text-fg font-sans antialiased select-none">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm tracking-tight text-fg">Tederash</h1>
            {tederashState.isTederash ? (
              <>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  v{tederashState.version || '0.1.0'}
                </span>
                {tederashState.profile && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-fg-muted border border-border">
                    {tederashState.profile}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-fg-muted border border-border font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-fg-muted inline-block" />
                Inactive
              </span>
            )}
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
          {tederashState.isTederash && messages.length > 0 && (
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
            {aiConfig.apiKeySource === 'dev' && (
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
                  model: nextProvider === 'groq' ? DEFAULT_MODEL : prev.model,
                }));
                if (nextProvider === 'groq') {
                  setModelInput(DEFAULT_MODEL);
                }
              }}
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="groq">Groq (gpt-oss-120b)</option>
              <option value="heuristic">Offline mode (no key needed)</option>
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
                    aiConfig.apiKeySource === 'saved'
                      ? '•••••••• (saved — leave empty to keep)'
                      : aiConfig.apiKeySource === 'dev'
                        ? '•••••••• (dev key from .env)'
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
                  placeholder={DEFAULT_MODEL}
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

      {/* Conditional Rendering: Locked Inactive View vs. Active Agent Interface */}
      {!tederashState.isTederash ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center gap-4 select-text">
          <div className="w-12 h-12 rounded-full border border-border bg-surface-elevated flex items-center justify-center text-fg-muted shadow-xs">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="font-semibold text-base text-fg tracking-tight">
              Tederash Assistant Inactive
            </h2>
            <p className="text-xs text-fg-muted max-w-[300px] leading-relaxed">
              The assistant only operates on web applications built using the{' '}
              <strong>Tederash Component Library</strong>.
            </p>
          </div>

          <div className="w-full max-w-[320px] p-3 rounded-lg border border-border bg-surface-elevated text-left flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
              <span>ACTIVE TAB</span>
              <span className="text-danger font-medium">NOT DETECTED</span>
            </div>
            <p
              className="text-xs text-fg font-medium truncate"
              title={tederashState.tabUrl || activeTabInfo.url}
            >
              {tederashState.tabTitle || activeTabInfo.title || 'Internal / Non-Tederash Tab'}
            </p>
            <p className="text-[11px] text-fg-muted truncate font-mono">
              {tederashState.tabUrl || activeTabInfo.url || 'No URL available'}
            </p>
          </div>

          <div className="w-full max-w-[320px] text-left text-xs bg-surface p-3.5 rounded-lg border border-border flex flex-col gap-2">
            <span className="font-medium text-fg text-xs">How to activate:</span>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-fg-muted">
              <li>
                Navigate to an application built with <code>@tederash/components</code>.
              </li>
              <li>
                Ensure <code>AccessibilityProvider</code> is mounted at the root.
              </li>
              <li>
                Or test against the documentation site at <code>localhost:3000</code>.
              </li>
            </ul>
          </div>

          <Button
            variant="secondary"
            size="compact"
            onClick={() => void verifyActiveTab()}
            className="mt-2"
          >
            Check Tab Again
          </Button>
        </div>
      ) : (
        <>
          {/* Message Stream */}
          <div
            ref={scrollContainerRef}
            role="log"
            aria-live="off"
            aria-label="Conversation history"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 select-text"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto text-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full border border-border bg-surface-elevated flex items-center justify-center text-sm font-mono font-medium text-fg">
                  AI
                </div>
                <h2 className="font-semibold text-sm text-fg tracking-tight">
                  Tederash Assistant Active
                </h2>
                <p className="text-xs text-fg-muted max-w-[280px] leading-relaxed">
                  Ask questions, adapt visual contrast, inspect accessible form fields, or navigate.
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
              messages.map((m, idx) => {
                const isLast = idx === messages.length - 1;
                const isCurrentInvestigating = isLast && isRunning && m.role === 'assistant';

                if (m.role === 'user') {
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col max-w-[88%] self-end items-end"
                    >
                      <div className="px-3.5 py-2.5 rounded-lg bg-accent text-accent-fg text-sm leading-relaxed shadow-xs">
                        {m.content}
                      </div>
                      <span className="text-[10px] text-fg-muted px-1 mt-1 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                }

                if (m.role === 'step') {
                  return (
                    <div
                      key={m.id}
                      className={`text-xs px-2.5 py-1.5 rounded-md border my-0.5 font-mono flex items-center gap-2 max-w-full ${
                        m.status === 'error'
                          ? 'border-danger/30 bg-danger/10 text-danger'
                          : 'border-border bg-surface-elevated text-fg-muted'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-fg-muted">Action</span>
                      <span className="truncate">{m.content}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className="flex flex-col w-full max-w-full self-start items-start text-sm py-1"
                  >
                    <ThoughtProcess
                      isInvestigating={isCurrentInvestigating}
                      activeVerb={m.activeVerb || (isCurrentInvestigating ? 'Thinking...' : undefined)}
                      toolCalls={m.toolCalls || []}
                    />

                    {m.content ? (
                      <div
                        className={`w-full px-3.5 py-2.5 rounded-lg text-sm leading-relaxed border shadow-xs max-w-full overflow-hidden ${
                          m.status === 'error'
                            ? 'border-danger/40 bg-danger/10 text-danger'
                            : 'border-border bg-surface text-fg'
                        }`}
                      >
                        <MarkdownRenderer content={m.content} />
                      </div>
                    ) : isCurrentInvestigating ? null : (
                      <div className="text-xs font-mono text-fg-muted italic py-1">
                        No response generated.
                      </div>
                    )}

                    <span className="text-[10px] text-fg-muted px-1 mt-1 font-mono">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}

            {isRunning && (
              <div className="self-start flex items-center gap-2 text-xs font-mono text-fg-muted px-3 py-2 rounded-md bg-surface-elevated border border-border">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                <span>Reasoning & executing…</span>
              </div>
            )}
          </div>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>

          {pendingConfirm && (
            <div
              ref={confirmRef}
              tabIndex={-1}
              role="alertdialog"
              aria-modal="false"
              aria-labelledby="agent-confirm-title"
              aria-describedby="agent-confirm-detail"
              className={`mx-3 mb-2 p-3 rounded-md border text-sm flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                pendingConfirm.risk === 'destructive'
                  ? 'border-red-600 bg-red-50 text-red-950'
                  : 'border-amber-600 bg-amber-50 text-amber-950'
              }`}
            >
              <p id="agent-confirm-title" className="font-semibold">
                {pendingConfirm.risk === 'destructive' ? 'Careful: ' : 'Please confirm: '}
                {pendingConfirm.title}
              </p>
              <p id="agent-confirm-detail" className="text-xs">
                {pendingConfirm.detail}
              </p>
              <div className="flex gap-2 justify-end">
                <Button size="compact" variant="ghost" onClick={() => answerConfirm(false)}>
                  Cancel
                </Button>
                <Button size="compact" variant="primary" onClick={() => answerConfirm(true)}>
                  Yes, do it
                </Button>
              </div>
            </div>
          )}

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
        </>
      )}
    </div>
  );
}
