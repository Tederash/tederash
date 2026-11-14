import type { ChatMessage } from '../../../shared/messages';
import type { PageState } from '../../../shared/tools';

export interface AgentSession {
  id: string;
  tabId: number;
  messages: ChatMessage[];
  status: 'idle' | 'running' | 'done' | 'error' | 'stopped';
  abortController?: AbortController;
  /** Working memory: the last Page Model read from the tab. */
  pageState?: PageState;
}

const STORAGE_KEY = 'tederash.agentSessions';
const MAX_PERSISTED_SESSIONS = 10;
const MAX_PERSISTED_MESSAGES = 120;
export const INTERRUPTED_MESSAGE =
  'This request was interrupted because the assistant restarted. Please ask again.';

const sessions = new Map<string, AgentSession>();
const activeTabSession = new Map<number, string>();
let loading: Promise<void> | null = null;

interface PersistedState {
  sessions: Array<Omit<AgentSession, 'abortController'>>;
  activeTabSession: Array<[number, string]>;
}

function sessionArea(): chrome.storage.StorageArea | undefined {
  try {
    // storage.session survives service-worker restarts and is cleared when the browser closes.
    return typeof chrome !== 'undefined' ? chrome.storage?.session : undefined;
  } catch {
    return undefined;
  }
}

/** Restores sessions after a service-worker restart; a turn that was running is marked interrupted. */
export function ensureSessionsLoaded(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const area = sessionArea();
      if (!area) return;
      try {
        const raw = (await area.get(STORAGE_KEY))?.[STORAGE_KEY] as PersistedState | undefined;
        if (!raw || !Array.isArray(raw.sessions)) return;
        for (const s of raw.sessions) {
          if (sessions.has(s.id)) continue;
          const restored: AgentSession = { ...s, messages: Array.isArray(s.messages) ? s.messages : [] };
          if (restored.status === 'running') {
            restored.status = 'error';
            for (const m of restored.messages) {
              if (m.role === 'assistant' && m.status === 'running') {
                m.status = 'error';
                m.content = m.content ? `${m.content}\n\n_${INTERRUPTED_MESSAGE}_` : INTERRUPTED_MESSAGE;
              }
            }
          }
          sessions.set(restored.id, restored);
        }
        for (const [tabId, id] of raw.activeTabSession ?? []) {
          if (!activeTabSession.has(tabId) && sessions.has(id)) activeTabSession.set(tabId, id);
        }
      } catch {
        // Corrupt or unavailable storage: start fresh.
      }
    })();
  }
  return loading;
}

/** Saves sessions (bounded; tool payloads are not stored, only summaries). */
export async function persistSessions(): Promise<void> {
  const area = sessionArea();
  if (!area) return;
  const recent = Array.from(sessions.values()).slice(-MAX_PERSISTED_SESSIONS);
  const state: PersistedState = {
    sessions: recent.map(({ abortController: _a, ...s }) => ({
      ...s,
      messages: s.messages.slice(-MAX_PERSISTED_MESSAGES).map((m) =>
        m.toolResult ? { ...m, toolResult: { ok: m.toolResult.ok, error: m.toolResult.error } } : m
      ),
    })),
    activeTabSession: Array.from(activeTabSession.entries()),
  };
  try {
    await area.set({ [STORAGE_KEY]: state });
  } catch {
    // Quota or availability issue: keep running from memory.
  }
}

export function getOrCreateSession(tabId: number, conversationId?: string): AgentSession {
  const id = conversationId || activeTabSession.get(tabId) || `conv_${Date.now()}`;
  let session = sessions.get(id);
  if (!session) {
    session = {
      id,
      tabId,
      messages: [],
      status: 'idle',
    };
    sessions.set(id, session);
  }
  activeTabSession.set(tabId, id);
  return session;
}

export function getSessionHistory(conversationId?: string): ChatMessage[] {
  if (conversationId && sessions.has(conversationId)) {
    return sessions.get(conversationId)?.messages || [];
  }
  const allSessions = Array.from(sessions.values());
  const last = allSessions[allSessions.length - 1];
  return last?.messages || [];
}

export function clearSessionHistory(conversationId?: string): void {
  if (conversationId) {
    sessions.delete(conversationId);
  } else {
    sessions.clear();
    activeTabSession.clear();
  }
  void persistSessions();
}

export function stopSession(conversationId?: string): boolean {
  for (const session of sessions.values()) {
    if (!conversationId || session.id === conversationId) {
      if (session.status === 'running') {
        session.status = 'stopped';
        session.abortController?.abort();
        session.messages.push({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Task stopped by user.',
          timestamp: Date.now(),
          status: 'error',
        });
        void persistSessions();
        return true;
      }
    }
  }
  return false;
}

/** Test helper: drop in-memory state (simulates a service-worker restart). */
export function resetSessionsForTests(): void {
  sessions.clear();
  activeTabSession.clear();
  loading = null;
}
