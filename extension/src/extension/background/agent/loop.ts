import { type LanguageModel, type ModelMessage, type Tool, streamText } from 'ai';
import type { PageState, ToolName, ToolResult } from '../../../shared/tools';
import { normalizeToolArgs, unsupportedEthiopicWords } from './args';
import { TurnGuards } from './guards';
import { formatPageState, toModelToolOutput } from './page-model';
import { SAVED_DETAIL_KEYS, substituteSavedDetails } from './saved-details';
import { getAgentTools, getToolDef } from './tools';

export interface ModelToolCall {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ModelStepRequest {
  system: string;
  messages: ModelMessage[];
  tools: Record<string, Tool>;
  toolChoice: 'auto' | 'none';
  abortSignal?: AbortSignal;
  onText: (delta: string) => void;
}

export interface ModelStepResult {
  text: string;
  toolCalls: ModelToolCall[];
  /** Provider/stream error, if the step failed (text may still be partial). */
  error?: unknown;
}

/** One model step. Injectable so the loop can be tested with a scripted model. */
export type CallModel = (req: ModelStepRequest) => Promise<ModelStepResult>;

/** Default CallModel: a single streamed step; tools have no `execute`, so the SDK only reports calls. */
export function createStreamingCallModel(model: LanguageModel): CallModel {
  return async (req) => {
    const out: ModelStepResult = { text: '', toolCalls: [] };
    try {
      const result = streamText({
        model,
        system: req.system,
        messages: req.messages,
        tools: req.tools,
        toolChoice: req.toolChoice,
        maxRetries: 1,
        abortSignal: req.abortSignal,
      });
      // fullStream (not textStream): textStream silently drops provider errors.
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          out.text += part.text;
          req.onText(part.text);
        } else if (part.type === 'tool-call') {
          out.toolCalls.push({ toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
        } else if (part.type === 'error') {
          out.error = part.error;
        }
      }
    } catch (err) {
      out.error = err;
    }
    return out;
  };
}

export type ExecTool = (contentTool: ToolName, args: Record<string, unknown>) => Promise<ToolResult>;

export interface LoopOptions {
  system: string;
  history: ModelMessage[];
  userGoal: string;
  callModel: CallModel;
  execTool: ExecTool;
  onText: (delta: string) => void;
  /**
   * Personal details saved on this device. Swapped into `{{saved:…}}` placeholders
   * just before a field is filled, so the plaintext never reaches the model.
   */
  savedDetails?: Record<string, string>;
  /** Called with the values that were actually filled, so they can be remembered. */
  onFilled?: (entries: Array<{ target: string; value: string }>) => void;
  /** Re-reads the Page Model (after navigation). */
  readPageState?: () => Promise<PageState | undefined>;
  initialPageVersion?: number;
  signal?: AbortSignal;
  now?: () => number;
  /**
   * The user is speaking to the assistant: the voice tools (`say`, `listen`) are
   * offered, so it can answer aloud and ask follow-up questions out loud.
   */
  voiceTurn?: boolean;
}

export interface LoopResult {
  text: string;
  error?: unknown;
  steps: number;
}

function versionOf(result: ToolResult): number | undefined {
  if (!result.ok) return undefined;
  const data = result.data as { pageVersion?: unknown } | undefined;
  const outcomeData = result.outcome?.data as { pageVersion?: unknown } | undefined;
  const v = data?.pageVersion ?? outcomeData?.pageVersion;
  return typeof v === 'number' ? v : undefined;
}

/**
 * The agent loop: one model step at a time, tools executed here (not by the SDK) so
 * every step passes through guards and policy. Always ends with a text answer.
 */
export async function runModelLoop(opts: LoopOptions): Promise<LoopResult> {
  const tools = getAgentTools({ voiceTurn: opts.voiceTurn });
  const guards = new TurnGuards(opts.userGoal, opts.now);
  guards.notePageVersion(opts.initialPageVersion);
  const messages: ModelMessage[] = [...opts.history, { role: 'user', content: opts.userGoal }];
  let text = '';

  for (let step = 0; ; step++) {
    if (opts.signal?.aborted) return { text, steps: step };
    const forceAnswer = guards.mustAnswer(step);

    let stepText = '';
    const res = await opts.callModel({
      system: opts.system,
      messages,
      tools,
      toolChoice: forceAnswer ? 'none' : 'auto',
      abortSignal: opts.signal,
      onText: (delta) => {
        if (!stepText && text) opts.onText('\n\n');
        stepText += delta;
        opts.onText(delta);
      },
    });
    if (stepText) text = text ? `${text}\n\n${stepText}` : stepText;

    if (res.error) return { text, error: res.error, steps: step + 1 };
    if (res.toolCalls.length === 0 || forceAnswer) return { text, steps: step + 1 };

    messages.push({
      role: 'assistant',
      content: [
        ...(res.text ? [{ type: 'text' as const, text: res.text }] : []),
        ...res.toolCalls.map((tc) => ({
          type: 'tool-call' as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input ?? {},
        })),
      ],
    });

    const results = [];
    for (const tc of res.toolCalls) {
      const value = await runToolCall(tc, guards, opts);
      results.push({
        type: 'tool-result' as const,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        output: { type: 'json' as const, value: value as never },
      });
    }
    messages.push({ role: 'tool', content: results });

    const nudge = guards.actNudge(step + 1);
    if (nudge) messages.push({ role: 'user', content: nudge });
  }
}

async function runToolCall(tc: ModelToolCall, guards: TurnGuards, opts: LoopOptions): Promise<unknown> {
  const def = getToolDef(tc.toolName);
  if (!def) {
    return { ok: false, code: 'UNKNOWN_TOOL', message: `There is no tool named "${tc.toolName}".` };
  }
  const args = normalizeToolArgs(tc.input);
  const parsed = def.inputSchema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    return { ok: false, code: 'INVALID_ARGUMENTS', message: `Invalid arguments for ${tc.toolName}: ${issues}` };
  }

  const resolved = resolveSavedDetails(args, opts.savedDetails ?? {});
  if ('error' in resolved) return resolved.error;

  if (def.contentTool === 'fill' && typeof args.value === 'string' && !resolved.fromSaved.has(args.value)) {
    const sources = [opts.userGoal, opts.system, ...userTexts(opts.history)];
    const invented = unsupportedEthiopicWords(args.value, sources);
    if (invented.length) {
      return {
        ok: false,
        code: 'VALUE_NOT_FROM_USER',
        message: `The value contains ${invented.map((w) => `“${w}”`).join(', ')}, which the user did not write. Copy the value letter for letter from the user's message: “${opts.userGoal}”. Drop only grammatical endings such as -ን.`,
      };
    }
  }

  if (def.contentTool === 'choose' && typeof args.option === 'string' && isCrossLanguageGuess(args.option, opts)) {
    return {
      ok: false,
      code: 'CONFIRM_OPTION',
      message: `The user wrote in Amharic and did not name “${args.option}”. Ask them in Amharic whether they mean “${args.option}”, listing the other options, and choose only after they agree.`,
    };
  }

  const verdict = guards.check(tc.toolName, args, def.kind);
  if (verdict.kind !== 'run') {
    return { ok: false, code: verdict.kind === 'duplicate' ? 'DUPLICATE_CALL' : 'PERCEPTION_BUDGET', message: verdict.note };
  }

  const result = await opts.execTool(def.contentTool, args);
  guards.notePageVersion(versionOf(result));
  if (result.ok && resolved.filled.length) opts.onFilled?.(resolved.filled);
  const output = toModelToolOutput(def.contentTool, result);

  // A click that opens a dialog only sets `domChanged`, so without this the model
  // never sees what it just opened and cannot describe it back to the user.
  const changedPage = result.ok && (result.outcome?.urlChanged || result.outcome?.domChanged);
  if (changedPage && def.kind === 'act' && opts.readPageState) {
    const page = await opts.readPageState();
    if (page) {
      guards.notePageVersion(page.pageVersion);
      return { ...(output as object), pageChanged: true, newPageState: formatPageState(page) };
    }
  }
  return output;
}

interface ResolvedValues {
  /** Substituted values, which are the user's own saved text rather than the model's. */
  fromSaved: Set<string>;
  /** Target/value pairs this call writes into the page. */
  filled: Array<{ target: string; value: string }>;
}

/**
 * Swaps `{{saved:…}}` placeholders in the call's values for the real saved details,
 * in place, so the model can reuse a detail it was never shown. A placeholder that
 * names something unsaved is refused rather than typed into the page literally.
 */
function resolveSavedDetails(
  args: Record<string, unknown>,
  saved: Record<string, string>
): ResolvedValues | { error: unknown } {
  const fromSaved = new Set<string>();
  const filled: Array<{ target: string; value: string }> = [];
  const unknown = new Set<string>();

  const resolve = (raw: unknown, target: unknown): string | undefined => {
    if (typeof raw !== 'string') return undefined;
    const out = substituteSavedDetails(raw, saved);
    out.unknown.forEach((key) => unknown.add(key));
    if (out.usedSaved) fromSaved.add(out.value);
    if (typeof target === 'string') filled.push({ target, value: out.value });
    return out.value;
  };

  if (typeof args.value === 'string') {
    const next = resolve(args.value, args.target);
    if (next !== undefined) args.value = next;
  }
  if (typeof args.option === 'string') {
    const next = resolve(args.option, args.target);
    if (next !== undefined) args.option = next;
  }
  if (Array.isArray(args.entries)) {
    for (const entry of args.entries) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const next = resolve(row.value, row.target);
      if (next !== undefined) row.value = next;
    }
  }

  if (unknown.size) {
    return {
      error: {
        ok: false,
        code: 'NOT_SAVED',
        message: `Nothing is saved under ${[...unknown].map((k) => `“${k}”`).join(', ')}. Ask the user for it, then fill in what they answer. Saved names are: ${SAVED_DETAIL_KEYS.join(', ')}.`,
      },
    };
  }
  return { fromSaved, filled };
}

/** Plain text of earlier user turns, used to check that filled values come from the user. */
function userTexts(history: ModelMessage[]): string[] {
  return history
    .filter((m) => m.role === 'user')
    .map((m) =>
      typeof m.content === 'string'
        ? m.content
        : m.content.map((p) => ('text' in p && typeof p.text === 'string' ? p.text : '')).join(' ')
    );
}

/**
 * A choose whose option is in a different script from an Amharic request, and which
 * neither the user nor the assistant has said yet, is a translation guess (gpt-oss
 * mapped "ድቅል" (hybrid) to "Remote"). Choices run without confirmation, so the
 * model must ask first; once the option appeared in the conversation it may proceed.
 */
function isCrossLanguageGuess(option: string, opts: LoopOptions): boolean {
  if (!/[\u1200-\u137F]/.test(opts.userGoal) || /[\u1200-\u137F]/.test(option)) return false;
  const said = [opts.userGoal, ...opts.history.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))];
  const o = option.toLowerCase();
  return !said.some((t) => t.toLowerCase().includes(o));
}
