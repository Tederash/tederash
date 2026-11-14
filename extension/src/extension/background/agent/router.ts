import type { ModelMessage } from 'ai';
import type { PageField, PageState } from '../../../shared/tools';
import type { CallModel, ModelToolCall } from './loop';
import type { AgentToolName } from './tools';

/**
 * Deterministic intent router: the offline agent (no API key) and the last fallback
 * when every model fails. It understands common, unambiguous requests and uses the
 * Page Model, so "insert X in the Full Name field" works without any LLM. Targets
 * are passed through as plain words; the content-side resolver matches them.
 */

export type RoutedIntent =
  | { kind: 'tool'; tool: AgentToolName; args: Record<string, unknown> }
  | { kind: 'answer'; text: string };

const QUOTES = /^["“'‘]+|["”'’.!?]+$/g;
const clean = (s: string) => s.trim().replace(QUOTES, '').trim();
const stripField = (s: string) => clean(s).replace(/^(the|my)\s+/i, '').replace(/\s+(field|box|input|dropdown|menu)$/i, '');

const CHOICE_KINDS = new Set(['select', 'combobox', 'radio']);

function fieldFor(state: PageState | undefined, words: string): PageField | undefined {
  if (!state) return undefined;
  const w = words.toLowerCase();
  return (
    state.fields.find((f) => f.label.toLowerCase() === w) ??
    state.fields.find((f) => f.label.toLowerCase().includes(w)) ??
    state.fields.find((f) => w.split(/\s+/).every((part) => f.label.toLowerCase().includes(part)))
  );
}

export function describeForm(state: PageState): string {
  if (!state.fields.length) return `I couldn't find any form fields on “${state.title}”.`;
  const lines = state.fields.map((f) => {
    const bits = [f.required ? 'required' : 'optional'];
    if (f.options?.length) bits.push(`options: ${f.options.join(', ')}`);
    if (f.sensitive) bits.push('you fill this one yourself');
    else if (f.value) bits.push(`currently “${f.value}”`);
    if (f.error) bits.push(`error: ${f.error}`);
    return `- **${f.label}** (${bits.join('; ')})`;
  });
  const required = state.fields.filter((f) => f.required).length;
  return `This form has ${state.fields.length} fields, ${required} required:\n\n${lines.join('\n')}`;
}

export function routeIntent(text: string, state?: PageState): RoutedIntent | undefined {
  const t = text.trim();
  let m: RegExpMatchArray | null;

  // "insert 'X' in the Full Name field", "type X into email", "put X in Y"
  if ((m = t.match(/^(?:please\s+)?(?:insert|type|enter|put|write|fill(?:\s+in)?)\s+(.+?)\s+(?:in|into|for|as)\s+(.+)$/i))) {
    const [, value = '', target = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: stripField(target), value: clean(value) } };
  }
  // "fill the email field with X"
  if ((m = t.match(/^(?:please\s+)?fill(?:\s+in)?\s+(.+?)\s+with\s+(.+)$/i))) {
    const [, target = '', value = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: stripField(target), value: clean(value) } };
  }
  // "change/set my work location to Remote"
  if ((m = t.match(/^(?:please\s+)?(?:now\s+)?(?:change|set|update|make)\s+(.+?)\s+to\s+(.+)$/i))) {
    const [, rawTarget = '', value = ''] = m;
    const target = stripField(rawTarget);
    const field = fieldFor(state, target);
    if (field && CHOICE_KINDS.has(field.kind)) {
      return { kind: 'tool', tool: 'choose', args: { target, option: clean(value) } };
    }
    return { kind: 'tool', tool: 'fill', args: { target, value: clean(value) } };
  }
  // "choose/select Remote for work location"
  if ((m = t.match(/^(?:please\s+)?(?:choose|select|pick)\s+(.+?)\s+(?:in|for|as|from)\s+(.+)$/i))) {
    const [, option = '', target = ''] = m;
    return { kind: 'tool', tool: 'choose', args: { target: stripField(target), option: clean(option) } };
  }
  // "check the terms box" / "uncheck newsletter"
  if ((m = t.match(/^(?:please\s+)?(un)?(?:check|tick)\s+(.+)$/i))) {
    const [, un, target = ''] = m;
    return { kind: 'tool', tool: 'set_checked', args: { target: stripField(target), checked: !un } };
  }
  // "click submit", "press the Next button"
  if ((m = t.match(/^(?:please\s+)?(?:click|press|tap)(?:\s+on)?\s+(.+?)(?:\s+button)?[.!]?$/i))) {
    return { kind: 'tool', tool: 'click', args: { target: clean(m[1] ?? '').replace(/^the\s+/i, '') } };
  }
  // Scrolling
  if ((m = t.match(/\bscroll\s+(up|down)\b/i))) return { kind: 'tool', tool: 'scroll', args: { direction: m[1]!.toLowerCase() } };
  if (/\b(scroll|go)\s+to\s+(the\s+)?top\b/i.test(t)) return { kind: 'tool', tool: 'scroll', args: { direction: 'top' } };
  if (/\b(scroll|go)\s+to\s+(the\s+)?bottom\b/i.test(t)) return { kind: 'tool', tool: 'scroll', args: { direction: 'bottom' } };

  // Preferences
  if (/\b(bigger|larger|increase)\b.*\b(text|font)\b|\b(text|font)\b.*\b(bigger|larger)\b/i.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1.25 } };
  }
  if (/\b(smaller|decrease|reset)\b.*\b(text|font)\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1 } };
  if (/\bhigh contrast\b|\bmore contrast\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { highContrast: true } };
  if (/\b(simplify|simpler|plain language|easier)\b/i.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { simplifiedLanguage: true, showInstructions: true } };
  }
  if (/\b(bigger|larger)\s+(buttons|targets)\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { targetSize: 'large' } };
  if (/\b(reduce|less|stop)\s+(motion|animation)/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { reduceMotion: true } };

  // Questions about the form, answered straight from the Page Model.
  if (state && /\b(form|fields?|required|need to (fill|enter)|ask(s|ing)? for)\b/i.test(t)) {
    return { kind: 'answer', text: describeForm(state) };
  }
  // Reading
  if (/\b(read( (this|the))?( page)?( aloud| to me)?$|read (this|the) page|what('s| is) (on )?this page|summari[sz]e)/i.test(t)) {
    return { kind: 'tool', tool: 'read_page', args: { detail: 'summary' } };
  }
  return undefined;
}

export const ROUTER_HELP =
  'I can do that with the AI assistant switched on. Without it I understand requests like “insert Abebe Bikila in the Full Name field”, “change work location to Remote”, “check the terms box”, “click Next”, “what does this form ask?”, “make the text bigger” or “read this page”.';

function lastToolOutput(messages: ModelMessage[]): Record<string, unknown> | undefined {
  const last = [...messages].reverse().find((m) => m.role === 'tool');
  const part = Array.isArray(last?.content) ? (last.content[0] as { output?: { value?: unknown } }) : undefined;
  const value = part?.output?.value;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function answerFromOutput(tool: AgentToolName, out: Record<string, unknown> | undefined): string {
  if (!out) return 'Done.';
  if (out.ok === false) return String(out.message ?? 'That did not work.');
  if (tool === 'read_page') {
    const data = out.data as { title?: string; headings?: Array<{ text?: string } | string>; readableContent?: string } | undefined;
    const headings = (data?.headings ?? []).map((h) => (typeof h === 'string' ? h : h.text ?? '')).filter(Boolean);
    const body = data?.readableContent ? `\n\n${data.readableContent.slice(0, 600)}…` : '';
    return `**${data?.title ?? 'This page'}**${headings.length ? `\n\nSections: ${headings.slice(0, 8).join(', ')}` : ''}${body}`;
  }
  return `Done — ${String(out.summary ?? 'finished')}.`.replace(/\.\.$/, '.');
}

/**
 * A CallModel backed by the router, so offline requests run through the same loop,
 * guards, policy and confirmation as model requests.
 */
export function createRouterCallModel(userGoal: string, state?: PageState): CallModel {
  const intent = routeIntent(userGoal, state);
  return async (req) => {
    const toolResultsSoFar = req.messages.filter((m) => m.role === 'tool').length;
    let text: string;
    if (!intent) text = ROUTER_HELP;
    else if (intent.kind === 'answer') text = intent.text;
    else if (toolResultsSoFar === 0 && req.toolChoice !== 'none') {
      const call: ModelToolCall = { toolCallId: 'router_1', toolName: intent.tool, input: intent.args };
      return { text: '', toolCalls: [call] };
    } else text = answerFromOutput(intent.tool, lastToolOutput(req.messages));
    req.onText(text);
    return { text, toolCalls: [] };
  };
}
