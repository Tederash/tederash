import { describe, expect, it, vi } from 'vitest';
import { MAX_STEPS, PERCEPTION_BUDGET } from '../../src/extension/background/agent/guards';
import {
  type CallModel,
  type ModelStepRequest,
  type ModelStepResult,
  runModelLoop,
} from '../../src/extension/background/agent/loop';
import type { ToolResult } from '../../src/shared/tools';

type Script = (req: ModelStepRequest, step: number) => Partial<ModelStepResult>;

/** A scripted model; records every request it receives. */
function scriptedModel(script: Script) {
  const requests: ModelStepRequest[] = [];
  const callModel: CallModel = async (req) => {
    const step = requests.length;
    requests.push({ ...req, messages: [...req.messages] });
    const out = script(req, step);
    if (out.text) req.onText(out.text);
    return { text: out.text ?? '', toolCalls: out.toolCalls ?? [], error: out.error };
  };
  return { callModel, requests };
}

const call = (toolName: string, input: unknown, id = `c_${Math.random()}`) => ({ toolCallId: id, toolName, input });

let version = 0;
const okResult = (message = 'ok', bump = true): ToolResult => ({
  ok: true,
  outcome: { ok: true, message, data: { pageVersion: bump ? ++version : version } },
});

function toolOutputs(req: ModelStepRequest): unknown[] {
  return req.messages
    .filter((m) => m.role === 'tool')
    .flatMap((m) => (m.content as Array<{ output: { value: unknown } }>).map((p) => p.output.value));
}

async function run(script: Script, execTool = vi.fn(async () => okResult()), extra: Partial<Parameters<typeof runModelLoop>[0]> = {}) {
  const model = scriptedModel(script);
  let streamed = '';
  const result = await runModelLoop({
    system: 'sys',
    history: [],
    userGoal: extra.userGoal ?? "insert 'Tsegaye Shewamare' in the Full Name field",
    callModel: model.callModel,
    execTool,
    onText: (t) => (streamed += t),
    ...extra,
  });
  return { result, requests: model.requests, execTool, streamed };
}

describe('runModelLoop', () => {
  it('acts with a single tool call and then answers (turn 2 of the repro)', async () => {
    const { result, requests, execTool, streamed } = await run((_req, step) =>
      step === 0
        ? { toolCalls: [call('fill', { target: 'fld:full-legal-name', value: 'Tsegaye Shewamare' })] }
        : { text: 'Done — Full Legal Name now says “Tsegaye Shewamare”.' }
    );
    expect(execTool).toHaveBeenCalledTimes(1);
    expect(execTool).toHaveBeenCalledWith('fill', { target: 'fld:full-legal-name', value: 'Tsegaye Shewamare' });
    expect(requests).toHaveLength(2);
    expect(result.text).toContain('Tsegaye Shewamare');
    expect(streamed).toBe(result.text);
    // The second request carries a valid tool-call / tool-result pair.
    const msgs = requests[1]!.messages;
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
  });

  it('maps model tool names to content tools', async () => {
    const { execTool } = await run(
      (_r, step) => (step === 0 ? { toolCalls: [call('set_preferences', { fontScale: 1.5, highContrast: null })] } : { text: 'ok' }),
      vi.fn(async () => okResult()),
      { userGoal: 'make the text bigger' }
    );
    expect(execTool).toHaveBeenCalledWith('tederash_update_pref', { fontScale: 1.5 });
  });

  it('answers repeated identical calls from the guard, then forces a text answer', async () => {
    const execTool = vi.fn(async () => okResult('Read 9 fields', false));
    const { requests } = await run(
      (req) => (req.toolChoice === 'none' ? { text: 'The form asks for 9 things.' } : { toolCalls: [call('inspect_form', {})] }),
      execTool,
      { userGoal: 'what does this form ask?', initialPageVersion: version }
    );
    expect(execTool).toHaveBeenCalledTimes(1);
    const outputs = toolOutputs(requests.at(-1)!);
    expect(outputs.filter((o: any) => o.code === 'DUPLICATE_CALL')).toHaveLength(2);
    expect(requests.at(-1)!.toolChoice).toBe('none');
    expect(requests.length).toBeLessThan(MAX_STEPS);
  });

  it('caps perception calls per turn', async () => {
    const execTool = vi.fn(async () => okResult('found', false));
    const queries = ['email', 'mail', 'e-mail address'];
    const { requests } = await run(
      (_r, step) => (step < queries.length ? { toolCalls: [call('find', { query: queries[step] })] } : { text: 'ok' }),
      execTool,
      { userGoal: 'what is the email field for?', initialPageVersion: version }
    );
    expect(execTool).toHaveBeenCalledTimes(PERCEPTION_BUDGET);
    expect(toolOutputs(requests.at(-1)!).at(-1)).toMatchObject({ code: 'PERCEPTION_BUDGET' });
  });

  it('returns INVALID_ARGUMENTS to the model instead of executing bad calls', async () => {
    const { execTool, requests } = await run((_r, step) =>
      step === 0 ? { toolCalls: [call('fill', { target: 'Full Name', value: null }), call('teleport', {})] } : { text: 'Sorry.' }
    );
    expect(execTool).not.toHaveBeenCalled();
    const [invalid, unknown] = toolOutputs(requests[1]!) as any[];
    expect(invalid).toMatchObject({ ok: false, code: 'INVALID_ARGUMENTS' });
    expect(invalid.message).toContain('value');
    expect(unknown).toMatchObject({ ok: false, code: 'UNKNOWN_TOOL' });
  });

  it('nudges once when an action was requested but the model only inspects', async () => {
    const perceive = [call('inspect_form', {}), call('read_page', {})];
    const { requests } = await run((_r, step) => (step < 2 ? { toolCalls: [perceive[step]!] } : { text: 'ok' }));
    const nudges = requests.at(-1)!.messages.filter((m) => m.role === 'user' && String(m.content).startsWith('Reminder'));
    expect(nudges).toHaveLength(1);
  });

  it('stops at the step cap with a forced answer', async () => {
    let n = 0;
    const { requests, result } = await run(
      (req) => (req.toolChoice === 'none' ? { text: 'Filled what I could.' } : { toolCalls: [call('fill', { target: 'Notes', value: `v${n++}` })] }),
      vi.fn(async () => okResult())
    );
    expect(requests).toHaveLength(MAX_STEPS);
    expect(requests.at(-1)!.toolChoice).toBe('none');
    expect(result.text).toBe('Filled what I could.');
  });

  it('returns provider errors with any partial text', async () => {
    const { result } = await run(() => ({ text: 'Working on it', error: new Error('boom') }));
    expect(result.error).toBeInstanceOf(Error);
    expect(result.text).toBe('Working on it');
  });

  it('re-reads PAGE STATE after a click navigates', async () => {
    const execTool = vi.fn(async (): Promise<ToolResult> => ({
      ok: true,
      outcome: { ok: true, message: 'Clicked "Next"', urlChanged: true },
    }));
    const readPageState = vi.fn(async () => ({
      url: 'https://x/step-2', title: 'Step 2', pageVersion: 99, headings: [], fields: [], buttons: [],
    }));
    const { requests } = await run(
      (_r, step) => (step === 0 ? { toolCalls: [call('click', { target: 'Next' })] } : { text: 'On step 2.' }),
      execTool,
      { userGoal: 'click next', readPageState }
    );
    expect(readPageState).toHaveBeenCalledTimes(1);
    expect(toolOutputs(requests[1]!)[0]).toMatchObject({ pageChanged: true });
    expect((toolOutputs(requests[1]!)[0] as any).newPageState).toContain('Step 2');
  });
});
