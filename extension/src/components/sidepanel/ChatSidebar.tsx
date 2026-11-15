import React, { useEffect, useRef, useState } from 'react';
import { useGuidedFill } from './useGuidedFill';
import { createEnvelope } from '../../shared/envelope';
import type {
  AgentStreamEvent,
  AiConfig,
  ChatMessage,
  SpeechTranscribeResponse,
} from '../../shared/messages';
import { Button } from '../ui/Button';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { type CaptureResult, useVoice, queryMicrophonePermission } from './useVoice';
import { useVoiceMode, type VoiceTurnMeta } from './useVoiceMode';
import { Contrast, Moon, Sun } from '../ui/icons';
import {
  ThinkingPromptInput,
  type ThinkingStatus,
  type ThinkingStep,
} from '../ui/thinking-prompt-input';

type Theme = 'light' | 'dark' | 'high-contrast';
const THEMES: Array<{ id: Theme; label: string; Icon: typeof Sun }> = [
  { id: 'light', label: 'Light theme', Icon: Sun },
  { id: 'dark', label: 'Dark theme', Icon: Moon },
  { id: 'high-contrast', label: 'High contrast theme', Icon: Contrast },
];
const THEME_KEY = 'tederash.sidepanel.theme';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) setTheme(saved);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch {
      // storage unavailable: keep the default
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);
  return [theme, setTheme];
}

const DEFAULT_MODEL = 'openai/gpt-oss-120b';


/** "Help me fill this form" in English, Amharic and Afaan Oromo starts guided filling. */
const GUIDED_FILL_REQUEST =
  /^(please\s+)?(help me\s+)?(fill|complete)\s+(in\s+)?(this|the)\s+form(\s+with me)?(\s+by voice)?\.?$|ቅጹን\s+(እንድሞላ\s+)?(አግዘኝ|እርዳኝ|ሙላልኝ|አብረን\s+እንሙላ)|unka\s+(kana\s+)?(akkan\s+guutu\s+)?(na\s+gargaari|guuti)/i;

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
  const [speechLanguageInput, setSpeechLanguageInput] = useState('');
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

  // Voice: dictation into the box, and the assistant's own spoken questions.
  const [interim, setInterim] = useState('');
  /** The pending draft was dictated, so the reply should be spoken back. */
  const [draftIsSpoken, setDraftIsSpoken] = useState(false);
  const [pendingListen, setPendingListen] = useState<
    Extract<AgentStreamEvent, { type: 'listen_request' }> | null
  >(null);
  const listenRef = useRef<HTMLDivElement>(null);
  /** Kept current so the keyboard-command listener can stay registered once. */
  const handleDictateRef = useRef<(() => Promise<void>) | null>(null);
  const voice = useVoice({
    language: aiConfig.speechLanguage,
    canUpload: aiConfig.hasApiKey !== false,
    onInterim: setInterim,
  });

  // Screen-reader announcements: the transcript itself is not a live region (it would
  // read every streamed token); status changes are debounced, answers read once.
  const [announcement, setAnnouncement] = useState('');
  const [theme, setTheme] = useTheme();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const started = Date.now();
    setElapsed(0);
    const t = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 1000);
    return () => window.clearInterval(t);
  }, [isRunning]);
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

  /** Spoken status for voice mode, so a blind user hears state changes. */
  const speakNotice = (text: string) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    void chrome.runtime.sendMessage(createEnvelope('tts/speak', { text })).catch(() => undefined);
  };

  // Hands-free voice mode: the mic stays live, speech starts and ends turns,
  // and speech during a spoken answer barges in. Kept in refs so the port
  // listener and the keyboard-command listener can stay registered once.
  const pendingListenRef = useRef(false);
  const voiceModeOnRef = useRef(false);
  const voiceTranscriptRef = useRef<(text: string, meta: VoiceTurnMeta) => void>(() => {});
  const voiceModeToggleRef = useRef<(() => void) | null>(null);
  const resumeVoiceModeRef = useRef<(() => void) | null>(null);
  const voiceMode = useVoiceMode({
    language: aiConfig.speechLanguage,
    canUpload: aiConfig.hasApiKey !== false || aiConfig.hasSttApiKey === true,
    pauseMs: aiConfig.speechPauseMs,
    onTranscript: (text, meta) => voiceTranscriptRef.current(text, meta),
    onNotice: (text) => {
      announce(text);
      speakNotice(text);
    },
    onInterim: setInterim,
    pendingListenRef,
  });
  const { toggle: toggleVoiceEngine, notifyTurnEnded, notifyListenPending } = voiceMode;
  voiceModeOnRef.current = voiceMode.enabled;

  // Guided form filling, one field at a time, confirmed before anything is written.
  // Voice tab: spoken questions and spoken answers. Text tab: the same script in chat.
  const [guidedInterim, setGuidedInterim] = useState('');
  const guided = useGuidedFill({
    mode: voiceMode.enabled ? 'voice' : 'text',
    onSay: (text) =>
      setMessages((prev) => {
        // Consecutive lines from the script ("Done." then the next question) share one reply.
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id.startsWith('guided_')) {
          return [...prev.slice(0, -1), { ...last, content: `${last.content}\n\n${text}` }];
        }
        return [...prev, { id: `guided_${Date.now()}_${prev.length}`, role: 'assistant', content: text, timestamp: Date.now() }];
      }),
    tabId: activeTabInfo.id,
    language: aiConfig.speechLanguage,
    canUpload: aiConfig.hasApiKey !== false || aiConfig.hasSttApiKey === true,
    onInterim: setGuidedInterim,
  });
  const startGuided = () => {
    const spoken = voiceMode.enabled;
    if (spoken) {
      // One listener at a time: voice mode's always-on mic would take the answers
      // as new requests. Suspend it (the tab stays on Voice) and resume afterwards.
      voiceMode.suspend(true);
      voiceMode.notifyTurnEnded();
    }
    void guided.start().finally(() => {
      if (spoken) voiceMode.suspend(false);
    });
  };

  /** Turns hands-free mode on or off and remembers the choice across sessions. */
  const setVoiceModeEnabled = async (next: boolean) => {
    toggleVoiceEngine(next);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        // Keys are never sent back; the background keeps what it has.
        await chrome.runtime.sendMessage(
          createEnvelope('ai/setConfig', {
            provider: aiConfig.provider,
            model: aiConfig.model,
            speechLanguage: aiConfig.speechLanguage,
            sttProvider: aiConfig.sttProvider,
            sttModel: aiConfig.sttModel,
            speechPauseMs: aiConfig.speechPauseMs,
            voiceMode: next,
          })
        );
      }
    } catch {
      // Persistence is best-effort; the mode still works this session.
    }
  };
  voiceModeToggleRef.current = () => void setVoiceModeEnabled(!voiceModeOnRef.current);
  // A voice-first user gets hands-free back on panel open, but only if the mic
  // permission is already granted: raising Chrome's prompt without a gesture
  // would open a permission tab on every panel open.
  resumeVoiceModeRef.current = () => {
    if (voiceModeOnRef.current || aiConfig.voiceMode !== true) return;
    void queryMicrophonePermission().then((state) => {
      if (state === 'granted') void setVoiceModeEnabled(true);
    });
  };

  // Applies an Alt+Shift+V pressed while the panel was closed: the background
  // could not deliver the toggle to a page that was not yet hydrated.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    void (async () => {
      try {
        const { pendingVoiceModeToggle } = await chrome.storage.local.get('pendingVoiceModeToggle');
        const request = pendingVoiceModeToggle as { ts?: number } | undefined;
        if (!request) return;
        await chrome.storage.local.remove('pendingVoiceModeToggle');
        if (typeof request.ts === 'number' && Date.now() - request.ts < 60_000) {
          voiceModeToggleRef.current?.();
        }
      } catch {
        // No stored request; nothing to apply.
      }
    })();
  }, []);

  // Same for a spoken question: move focus so Done/Cancel are reachable at once.
  useEffect(() => {
    if (pendingListen) listenRef.current?.focus();
  }, [pendingListen]);

  // Alt+Shift+V (the start-listening command) toggles hands-free voice mode
  // from anywhere; the mic button remains for dictation in text mode.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const onCommand = (msg: unknown) => {
      const type = (msg as { type?: string } | null)?.type;
      if (type === 'panel/startListening') {
        void handleDictateRef.current?.();
      }
      if (type === 'panel/toggleVoiceMode') {
        voiceModeToggleRef.current?.();
      }
    };
    chrome.runtime.onMessage.addListener(onCommand);
    return () => chrome.runtime.onMessage.removeListener(onCommand);
  }, []);

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
        let t = tabs[0];
        // If the sidepanel is opened in its own tab (e.g. during testing or development),
        // tabs[0] is the sidepanel itself (chrome-extension://...). Look for the active or
        // first non-extension webpage tab in the window so the assistant connects properly.
        if (t?.url && (t.url.startsWith('chrome-extension://') || t.url.startsWith('chrome://'))) {
          const allTabs = await chrome.tabs.query({ currentWindow: true });
          const candidate = allTabs.find(
            (tab) =>
              tab.id !== t?.id &&
              tab.url &&
              !tab.url.startsWith('chrome-extension://') &&
              !tab.url.startsWith('chrome://')
          );
          if (candidate) {
            t = candidate;
          }
        }
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
            setSpeechLanguageInput(configRes.config.speechLanguage || '');
            resumeVoiceModeRef.current?.();
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

  /** Turns a finished capture into text, transcribing in the worker when needed. */
  const resolveTranscript = async (result: CaptureResult): Promise<string | undefined> => {
    if (result.text) return result.text;
    if (!result.audioBase64) return undefined;
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return undefined;
    const res = (await chrome.runtime.sendMessage(
      createEnvelope('speech/transcribe', {
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        language: aiConfig.speechLanguage,
      })
    )) as SpeechTranscribeResponse;
    if (!res?.ok) throw new Error(res?.error ?? 'That could not be transcribed.');
    return res.text;
  };

  /**
   * Mic button: dictation lands in the box rather than sending straight away, so a
   * misheard phrase can be corrected before it becomes an action on the page.
   */
  const handleDictate = async () => {
    if (voice.isCapturing) {
      voice.stop();
      return;
    }
    setInterim('');
    announce('Listening. Press the microphone again to stop.');
    const result = await voice.capture();
    setInterim('');
    if (result.cancelled) return;
    if (result.error) {
      announce(result.error);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: result.error!,
          timestamp: Date.now(),
          status: 'error',
        },
      ]);
      return;
    }
    try {
      const text = await resolveTranscript(result);
      if (!text) {
        announce('Nothing was heard.');
        return;
      }
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      setDraftIsSpoken(true);
      announce('Dictation ready. Check it, then press Enter to send.');
      inputRef.current?.focus();
    } catch (err) {
      announce(err instanceof Error ? err.message : 'That could not be transcribed.');
    }
  };

  handleDictateRef.current = handleDictate;

  /** The assistant asked out loud: record the answer and send it back into the turn. */
  const answerListen = async (request: Extract<AgentStreamEvent, { type: 'listen_request' }>) => {
    const reply = (payload: Record<string, unknown>) => {
      try {
        activePortRef.current?.postMessage({ type: 'agent/voiceReply', id: request.id, ...payload });
      } catch {
        // The turn is gone; nothing to answer.
      }
      setPendingListen(null);
      setInterim('');
    };

    const result = await voice.capture();
    setInterim('');
    if (result.cancelled) {
      reply({ kind: 'cancelled', reason: 'cancelled' });
      return;
    }
    if (result.error) {
      announce(result.error);
      reply({ kind: 'cancelled', reason: result.error });
      return;
    }
    if (result.text) {
      reply({ kind: 'text', text: result.text, language: request.language });
      return;
    }
    reply({
      kind: 'audio',
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      language: request.language,
    });
  };

  const handleSend = async (customText?: string, options: { isVoiceTurn?: boolean } = {}) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isRunning) return;

    // While guided filling runs in the Text tab, typed messages answer its questions.
    if (guided.isRunning()) {
      if (!customText) setInput('');
      setMessages((prev) => [
        ...prev,
        { id: `guided_u_${Date.now()}`, role: 'user', content: textToSend.trim(), timestamp: Date.now() },
      ]);
      guided.answer(textToSend.trim());
      return;
    }
    if (GUIDED_FILL_REQUEST.test(textToSend.trim())) {
      if (!customText) setInput('');
      setMessages((prev) => [
        ...prev,
        { id: `guided_u_${Date.now()}`, role: 'user', content: textToSend.trim(), timestamp: Date.now() },
      ]);
      startGuided();
      return;
    }

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
          if (event.type === 'listen_request') {
            setPendingListen(event);
            announce(`${event.prompt} Listening for your answer.`);
            if (voiceModeOnRef.current) {
              // Hands-free: the next utterance the mic hears is the answer; no
              // separate recording session and no button press.
              pendingListenRef.current = true;
              notifyListenPending(true);
              return;
            }
            void answerListen(event);
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
            setPendingListen(null);
            if (pendingListenRef.current) {
              pendingListenRef.current = false;
              notifyListenPending(false);
            }
            // Hands the microphone back to the user in voice mode.
            notifyTurnEnded();
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
          setPendingListen(null);
          if (pendingListenRef.current) {
            pendingListenRef.current = false;
            notifyListenPending(false);
          }
          notifyTurnEnded();
          setIsRunning(false);
          activePortRef.current = null;
        });

        port.postMessage({
          type: 'agent/stream/start',
          tabId,
          text: textToSend,
          isVoiceTurn: options.isVoiceTurn === true,
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

  /**
   * A hands-free utterance: either an answer to a question the assistant asked
   * out loud, or a new request. The decision is made here, at transcript time,
   * not at speech start: a user may barge in while the question is still being
   * spoken, and the `listen_request` only arrives once the audio finishes — that
   * utterance is still the answer to it. Speech that arrived with no question
   * pending stops the interrupted turn first, so two turns never run at once.
   */
  const handleVoiceTranscript = async (text: string, meta: VoiceTurnMeta) => {
    announce(`You said: ${text}`);
    if (pendingListenRef.current) {
      const request = pendingListen;
      pendingListenRef.current = false;
      notifyListenPending(false);
      setPendingListen(null);
      try {
        activePortRef.current?.postMessage({
          type: 'agent/voiceReply',
          id: request?.id ?? '',
          kind: 'text',
          text,
          language: aiConfig.speechLanguage,
        });
      } catch {
        // The turn is gone; the transcript is still visible in the panel.
      }
      return;
    }
    if (isRunning || meta.isBargeIn) await handleStop();
    await handleSend(text, { isVoiceTurn: true });
  };
  voiceTranscriptRef.current = (text, meta) => void handleVoiceTranscript(text, meta);

  /** Backs out of a spoken question: in voice mode that answers "cancelled" into the turn. */
  const cancelListen = () => {
    if (voiceMode.enabled && pendingListen) {
      pendingListenRef.current = false;
      notifyListenPending(false);
      try {
        activePortRef.current?.postMessage({
          type: 'agent/voiceReply',
          id: pendingListen.id,
          kind: 'cancelled',
          reason: 'cancelled',
        });
      } catch {
        // The turn is gone; nothing to answer.
      }
      setPendingListen(null);
      return;
    }
    voice.cancel();
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
            speechLanguage: speechLanguageInput.trim() || undefined,
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
      void handleSend(undefined, { isVoiceTurn: draftIsSpoken });
    }
  };

  const suggestions = [
    'Inspect Tederash form fields',
    'Switch to low-vision profile',
    'Simplify instructions and language',
    'Scan accessibility layout',
    'Explain required fields',
  ];

  /** The hands-free status line: never colour-only, always named. */
  const VOICE_STATUS_LABEL: Record<string, string> = {
    starting: 'Voice mode: starting the microphone…',
    listening: 'Voice mode: listening — just speak',
    capturing: 'Hearing you…',
    transcribing: 'Understanding…',
    busy: 'Working…',
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bg text-fg font-sans antialiased select-none">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-medium text-[15px] tracking-tight text-fg">Tederash</h1>
            {!tederashState.isTederash && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border text-fg-muted font-medium">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full inline-block bg-fg-muted"
                />
                Inactive
              </span>
            )}
          </div>
          {activeTabInfo.title && (
            <span className="text-[11px] text-fg-muted truncate mt-0.5" title={activeTabInfo.url}>
              {activeTabInfo.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Text/Voice mode switch: the anchor of hands-free interaction. */}
          <div
            role="group"
            aria-label="Interaction mode"
            className="flex items-center rounded-full border border-border bg-surface p-0.5 shrink-0"
          >
            <button
              type="button"
              aria-pressed={!voiceMode.enabled}
              onClick={() => void setVoiceModeEnabled(false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                voiceMode.enabled
                  ? 'text-fg-muted hover:text-fg'
                  : 'bg-accent text-accent-fg font-semibold'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              aria-pressed={voiceMode.enabled}
              onClick={() => void setVoiceModeEnabled(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                voiceMode.enabled
                  ? 'bg-accent text-accent-fg font-semibold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Voice
            </button>
          </div>

          <div role="group" aria-label="Theme" className="flex items-center rounded-full border border-border bg-surface p-0.5">
            {THEMES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={theme === id}
                title={label}
                onClick={() => setTheme(id)}
                className={`inline-flex size-7 items-center justify-center rounded-full outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus ${
                  theme === id ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Settings"
            aria-expanded={showSettings}
            title="Configure AI model & API key"
            className="h-8 px-3 text-xs font-medium text-fg-muted hover:text-fg rounded-full border border-border bg-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Settings
          </button>
          {tederashState.isTederash && messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Clear chat conversation"
              title="Clear chat history"
              className="h-8 px-3 text-xs font-medium text-fg-muted hover:text-danger rounded-full border border-border bg-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus"
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

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <label htmlFor="speech-language" className="text-xs font-medium text-fg-muted">
              Voice language
            </label>
            <input
              id="speech-language"
              type="text"
              placeholder="Browser default (e.g. en-US, am-ET, om-ET)"
              value={speechLanguageInput}
              onChange={(e) => setSpeechLanguageInput(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-[11px] text-fg-muted">
              {voice.isSupported
                ? voice.mode === 'upload'
                  ? 'Dictation is transcribed with your API key. Spoken replies use the voices installed on this device, and stay silent for a language with no voice rather than reading it in the wrong one.'
                  : 'Dictation runs in this browser, so no audio leaves the device. Add an API key for more accurate transcription.'
                : 'This browser has no microphone support available to the panel.'}
            </p>
          </div>

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
          {(() => {
            let turnStart = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i]!.role === 'user') {
                turnStart = i;
                break;
              }
            }
            const earlier = turnStart > 0 ? messages.slice(0, turnStart) : [];
            const turnUser = turnStart >= 0 ? messages[turnStart] : undefined;
            const turnAsst =
              turnStart >= 0 ? [...messages.slice(turnStart + 1)].reverse().find((m) => m.role === 'assistant') : undefined;
            const steps: ThinkingStep[] = [
              ...(turnAsst?.toolCalls ?? []).map((tc) => ({
                id: tc.id,
                text: tc.summary || tc.rationale || tc.tool,
                status: (tc.status === 'PENDING' ? 'active' : 'complete') as ThinkingStep['status'],
              })),
              ...(turnStart >= 0
                ? messages
                    .slice(turnStart + 1)
                    .filter((m) => m.role === 'step')
                    .map((m) => ({ id: m.id, text: m.content, status: 'complete' as const }))
                : []),
            ];
            const status: ThinkingStatus = !turnUser
              ? 'idle'
              : isRunning
                ? turnAsst?.content
                  ? 'answering'
                  : 'thinking'
                : 'done';

            return (
              <div className="flex-1 min-h-0 flex flex-col items-center px-4 pb-4 select-text">
                {earlier.length > 0 && (
                  <div
                    ref={scrollContainerRef}
                    role="log"
                    aria-live="off"
                    aria-label="Earlier messages"
                    className="w-full max-w-[480px] max-h-[35%] overflow-y-auto mb-3 flex flex-col gap-3 border-b border-border pb-3"
                  >
                    {earlier
                      .filter((m) => m.role !== 'step')
                      .map((m) =>
                        m.role === 'user' ? (
                          <div
                            key={m.id}
                            className="ml-auto w-fit max-w-[94%] rounded-2xl rounded-br-sm bg-surface-elevated px-3.5 py-2 text-[13px] leading-5 text-fg"
                          >
                            {m.content}
                          </div>
                        ) : (
                          <div
                            key={m.id}
                            className={`text-sm leading-6 ${m.status === 'error' ? 'text-danger' : 'text-fg'}`}
                          >
                            {m.content ? <MarkdownRenderer content={m.content} /> : null}
                          </div>
                        )
                      )}
                  </div>
                )}

                {status === 'idle' && (
                  <div className="w-full max-w-[480px] my-auto flex flex-col gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-fg-muted">
                        Your accessibility assistant
                      </p>
                      <h2 className="text-[22px] font-medium leading-tight tracking-tight text-fg">
                        What should this page do for you?
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleSend(sug)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-elevated text-fg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <ThinkingPromptInput
                  className={status === 'idle' ? '!h-auto' : 'flex-1'}
                  status={status}
                  prompt={turnUser?.content ?? ''}
                  steps={steps}
                  answer={turnAsst?.content ?? ''}
                  renderAnswer={(text) => (
                    <div className={turnAsst?.status === 'error' ? 'text-danger' : undefined}>
                      <MarkdownRenderer content={text} />
                    </div>
                  )}
                  elapsedSeconds={elapsed}
                  value={input}
                  onValueChange={(val) => {
                    setInput(val);
                    setDraftIsSpoken(false);
                  }}
                  hideThinkToggle
                  placeholder="Ask Tederash or describe an action"
                  followUpPlaceholder="Ask a follow-up"
                  onSubmit={(text) => {
                    void handleSend(text, { isVoiceTurn: draftIsSpoken });
                    setDraftIsSpoken(false);
                  }}
                  onStop={() => void handleStop()}
                  beforeComposer={
                    <>
                      {guided.running && voiceMode.enabled && guided.ui && (
                        // Status only, for sighted helpers. The conversation itself is spoken;
                        // aria-hidden so a screen reader does not talk over the assistant.
                        <p aria-hidden="true" className="mb-2 text-xs text-fg-muted">
                          {guided.ui.total ? `Question ${Math.max(1, guided.ui.index)} of ${guided.ui.total} · ` : ''}
                          {guided.ui.phase === 'listening' || guided.ui.phase === 'confirming'
                            ? guidedInterim
                              ? `Hearing “${guidedInterim}”`
                              : 'Listening'
                            : 'Speaking'}
                        </p>
                      )}
                      {pendingConfirm && (
                        <div
                          ref={confirmRef}
                          tabIndex={-1}
                          role="alertdialog"
                          aria-modal="false"
                          aria-labelledby="agent-confirm-title"
                          aria-describedby="agent-confirm-detail"
                          className={`mb-3 p-3 rounded-2xl border-2 text-sm flex flex-col gap-2 bg-surface text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                            pendingConfirm.risk === 'destructive' ? 'border-danger' : 'border-warning'
                          }`}
                        >
                          <p id="agent-confirm-title" className="font-semibold">
                            {pendingConfirm.risk === 'destructive' ? 'Careful: ' : 'Please confirm: '}
                            {pendingConfirm.title}
                          </p>
                          <p id="agent-confirm-detail" className="text-xs text-fg-muted">
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

                      {/* The assistant asked a question out loud and is waiting for the answer. */}
                      {pendingListen && (
                        <div
                          ref={listenRef}
                          tabIndex={-1}
                          role="group"
                          aria-label="Answering by voice"
                          className="mb-3 p-3 rounded-2xl border-2 border-accent/60 bg-accent/10 text-sm flex flex-col gap-2"
                        >
                          <p className="font-medium text-fg">{pendingListen.prompt}</p>
                          <p className="text-xs text-fg-muted">
                            {voiceMode.enabled
                              ? 'Just say your answer out loud.'
                              : voice.needsPermission
                                ? 'Allow the microphone on the tab that just opened, then come back here.'
                                : voice.isCapturing
                                  ? interim || 'Listening… speak your answer, then press Done.'
                                  : 'Starting the microphone…'}
                          </p>
                          <div className="flex gap-2 justify-end">
                            <Button size="compact" variant="ghost" onClick={cancelListen}>
                              Cancel
                            </Button>
                            {!voiceMode.enabled && (
                              <Button size="compact" variant="primary" onClick={() => voice.stop()}>
                                Done
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Voice mode status badge or dictation preview */}
                      {voiceMode.enabled && (
                        <div
                          role="status"
                          className="mb-2 text-[11px] font-medium text-accent flex items-center gap-1.5 px-1"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full inline-block ${
                              voiceMode.status === 'busy' ? 'bg-amber-500' : 'bg-success'
                            }`}
                            aria-hidden="true"
                          />
                          {interim || VOICE_STATUS_LABEL[voiceMode.status] || 'Voice mode'}
                        </div>
                      )}

                      {voice.needsPermission ? (
                        <p className="mb-2 text-[11px] text-fg-muted px-1" role="status">
                          Allow the microphone on the tab that just opened, then come back here.
                        </p>
                      ) : (
                        !pendingListen &&
                        voice.isCapturing && (
                          <p className="mb-2 text-[11px] text-fg-muted italic px-1" aria-hidden="true">
                            {interim || 'Listening…'}
                          </p>
                        )
                      )}
                    </>
                  }
                  extraActions={
                    voice.isSupported && !pendingListen && !voiceMode.enabled ? (
                      <Button
                        type="button"
                        variant={voice.isCapturing ? 'danger' : 'ghost'}
                        size="compact"
                        onClick={() => void handleDictate()}
                        disabled={isRunning}
                        aria-pressed={voice.isCapturing}
                        aria-label={voice.isCapturing ? 'Stop dictating' : 'Dictate a message'}
                        className="h-8 rounded-xl px-2.5 text-xs"
                      >
                        {voice.isCapturing ? 'Stop mic' : 'Speak'}
                      </Button>
                    ) : null
                  }
                />
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
