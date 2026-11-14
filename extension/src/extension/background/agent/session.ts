import type { ChatMessage } from '../../../shared/messages';

export interface AgentSession {
  id: string;
  tabId: number;
  messages: ChatMessage[];
  status: 'idle' | 'running' | 'done' | 'error' | 'stopped';
  abortController?: AbortController;
}

const sessions = new Map<string, AgentSession>();
const activeTabSession = new Map<number, string>();

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
        return true;
      }
    }
  }
  return false;
}
