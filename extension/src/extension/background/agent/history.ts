import type { ModelMessage } from 'ai';
import type { ChatMessage } from '../../../shared/messages';

const MAX_HISTORY_MESSAGES = 12;
const MAX_ASSISTANT_CHARS = 1200;

/**
 * Projects the stored transcript into prior-turn messages for the model.
 * Only user and assistant text is replayed; earlier tool payloads are not, so the
 * model works from what was concluded rather than re-reading old page dumps.
 */
export function toModelHistory(
  messages: ChatMessage[],
  limit = MAX_HISTORY_MESSAGES
): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const m of messages) {
    if (m.role === 'user' && m.content.trim()) {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant' && m.content.trim() && m.status !== 'running') {
      const text =
        m.content.length > MAX_ASSISTANT_CHARS
          ? `${m.content.slice(0, MAX_ASSISTANT_CHARS)}…`
          : m.content;
      const actions = (m.toolCalls ?? [])
        .filter((tc) => tc.summary)
        .map((tc) => `- ${tc.summary}`)
        .join('\n');
      out.push({
        role: 'assistant',
        content: actions ? `${text}\n\n[Steps taken]\n${actions}` : text,
      });
    }
  }
  return out.slice(-limit);
}
