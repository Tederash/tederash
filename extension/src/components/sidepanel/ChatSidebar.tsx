import React, { useEffect, useRef, useState } from 'react';
import { createEnvelope } from '../../shared/envelope';
import type {
  AgentStreamEvent,
  AiConfig,
  ChatMessage,
  SettingsGetResponse,
  SpeechTranscribeResponse,
  VaultGetResponse,
} from '../../shared/messages';
import { ProfileForm } from '../profile/ProfileForm';
import { SettingsDrawer } from './SettingsDrawer';
import { Button } from '../ui/Button';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { type CaptureResult, useVoice, queryMicrophonePermission } from './useVoice';
import { useVoiceMode, type VoiceTurnMeta } from './useVoiceMode';
import { Contrast, Moon, Sun } from '../ui/icons';
import { VoicePoweredOrb } from '../ui/voice-powered-orb';
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
  /**
   * The profile the assistant fills forms from. Collected once on first run, so it
   * never has to interrogate the user mid-task. `undefined` until loaded, so the
   * first-run screen does not flash for someone who already has a profile.
   */
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const hasProfile = Object.keys(profile).length > 0;
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

  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [activeSpeakingText, setActiveSpeakingText] = useState('');
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markAgentSpeaking = (text: string, durationMs?: number) => {
    setIsAgentSpeaking(true);
    setActiveSpeakingText(text);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    const ms = durationMs ?? Math.max(1800, Math.min(12000, text.length * 75 + 1000));
    speakingTimerRef.current = setTimeout(() => {
      setIsAgentSpeaking(false);
      setActiveSpeakingText('');
    }, ms);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const interval = window.setInterval(() => {
      if (window.speechSynthesis?.speaking) {
        setIsAgentSpeaking(true);
      }
    }, 150);
    return () => window.clearInterval(interval);
  }, []);

  /** Marks the first run done so the profile screen is offered only once. */
  const completeOnboarding = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage(createEnvelope('onboarding/complete', { completed: true }));
      }
    } catch {
      // Best effort: the screen is dismissed either way.
    }
    setShowProfileSetup(false);
  };

  const saveProfile = async (values: Record<string, string>) => {
    setSavingProfile(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = (await chrome.runtime.sendMessage(
          createEnvelope('vault/set', { entries: values })
        )) as VaultGetResponse;
        if (res?.ok) setProfile(res.entries);
      }
      await completeOnboarding();
      announce('Your details are saved.');
    } finally {
      setSavingProfile(false);
    }
  };

  /** Spoken status for voice mode, so a blind user hears state changes. */
  const speakNotice = (text: string) => {
    markAgentSpeaking(text);
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    void chrome.runtime.sendMessage(createEnvelope('tts/speak', { text })).catch(() => undefined);
  };

  // Hands-free voice mode: the mic stays live, speech starts and ends turns,
  // and speech during a spoken answer barges in. Kept in refs so the port
  // listener and the keyboard-command listener can stay registered once.
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
  });
  const { toggle: toggleVoiceEngine, notifyTurnEnded } = voiceMode;
  voiceModeOnRef.current = voiceMode.enabled;

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
            resumeVoiceModeRef.current?.();
          }

          // The saved profile, and whether to offer to set one up.
          const [vaultRes, settingsRes] = await Promise.all([
            chrome.runtime.sendMessage(createEnvelope('vault/get', {})) as Promise<VaultGetResponse>,
            chrome.runtime.sendMessage(createEnvelope('settings/get', {})) as Promise<SettingsGetResponse>,
          ]);
          if (vaultRes?.ok) setProfile(vaultRes.entries);
          const hasProfile = Object.keys(vaultRes?.ok ? vaultRes.entries : {}).length > 0;
          if (settingsRes?.ok && !settingsRes.onboardingCompleted && !hasProfile) {
            setShowProfileSetup(true);
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

  const handleSend = async (customText?: string, options: { isVoiceTurn?: boolean } = {}) => {
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
            if (event.toolCall.tool === 'say') {
              const text = (event.toolCall.arguments as any)?.text || '';
              markAgentSpeaking(text);
            }
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
            if (voiceMode.enabled) {
              markAgentSpeaking('Speaking answer…', 1500);
            }
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
            if (voiceMode.enabled && finalContent) {
              markAgentSpeaking(finalContent.slice(0, 200));
            }
            setIsRunning(false);
            activePortRef.current = null;
            inputRef.current?.focus();
          }
        });

        port.onDisconnect.addListener(() => {
          setPendingConfirm(null);
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
   * A hands-free utterance is always a new request: the assistant never asks
   * questions of its own, so there is nothing to route an answer into. Speech that
   * arrives mid-turn stops the interrupted turn first, so two never run at once.
   */
  const handleVoiceTranscript = async (text: string, meta: VoiceTurnMeta) => {
    announce(`You said: ${text}`);
    if (isRunning || meta.isBargeIn) await handleStop();
    await handleSend(text, { isVoiceTurn: true });
  };
  voiceTranscriptRef.current = (text, meta) => void handleVoiceTranscript(text, meta);


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
      <header className="px-4 pt-3 pb-2 flex items-center justify-end gap-1.5 shrink-0">
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
          <button
            type="button"
            onClick={() => setShowProfileSetup(true)}
            aria-label="Your saved details"
            title="The details Tederash fills forms from"
            className="h-8 px-3 text-xs font-medium text-fg-muted hover:text-fg rounded-full border border-border bg-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Your details
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

      {/* First run: collect the profile once, so the assistant never has to ask mid-task. */}
      {showProfileSetup ? (
        <main className="flex-1 overflow-y-auto px-4 pb-4" aria-labelledby="profile-setup-heading">
          <h2 id="profile-setup-heading" className="text-base font-semibold text-fg mb-1">
            {hasProfile ? 'Your details' : 'Tell Tederash about you'}
          </h2>
          <p className="text-sm text-fg-muted mb-3">
            Saved once, so filling a form later takes one sentence instead of twenty questions.
            {hasProfile ? '' : ' You can skip this and add details whenever you like.'}
          </p>
          <ProfileForm
            idPrefix="setup"
            values={profile}
            saving={savingProfile}
            onSave={saveProfile}
            onSkip={() => void completeOnboarding()}
            skipLabel={hasProfile ? 'Close' : 'Skip for now'}
          />
        </main>
      ) : (
      <>

      {showSettings && (
        <SettingsDrawer
          config={aiConfig}
          onConfigChange={setAiConfigState}
          onClose={() => setShowSettings(false)}
          voiceSupported={voice.isSupported}
          voiceMode={voice.mode}
        />
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
      ) : voiceMode.enabled ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 pb-6 select-text relative overflow-hidden">
          <div className="w-56 h-56 sm:w-64 sm:h-64 relative flex items-center justify-center my-auto">
            <VoicePoweredOrb
              isSpeaking={isAgentSpeaking}
              enableVoiceControl={false}
              className="rounded-full overflow-hidden shadow-2xl"
            />
          </div>

          <div className="w-full max-w-sm flex flex-col items-center gap-3 text-center mb-6">
            {isAgentSpeaking ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span className="truncate max-w-[260px]">{activeSpeakingText || 'Speaking…'}</span>
              </div>
            ) : voice.isCapturing || interim ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Hearing you</span>
                <p className="text-sm text-fg italic font-medium px-4 truncate max-w-xs">{interim || 'Listening…'}</p>
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Thinking…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Voice Mode Active</span>
                <p className="text-xs text-fg-muted/80">Hands-free assistant listening — just speak</p>
              </div>
            )}

            {(() => {
              const lastAsst = [...messages].reverse().find((m) => m.role === 'assistant');
              if (!lastAsst?.content) return null;
              return (
                <div className="w-full max-h-32 overflow-y-auto rounded-xl border border-border bg-surface p-3 text-left text-xs leading-relaxed text-fg">
                  <MarkdownRenderer content={lastAsst.content} />
                </div>
              );
            })()}
          </div>
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
                        voice.isCapturing && (
                          <p className="mb-2 text-[11px] text-fg-muted italic px-1" aria-hidden="true">
                            {interim || 'Listening…'}
                          </p>
                        )
                      )}
                    </>
                  }
                  extraActions={
                    voice.isSupported && !voiceMode.enabled ? (
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
      </>
      )}
    </div>
  );
}
