import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CallModel,
  type ExecTool,
  type ModelStepRequest,
  type ModelStepResult,
  runModelLoop,
} from '../../src/extension/background/agent/loop';
import { runAgentTaskStream } from '../../src/extension/background/agent/orchestrator';
import { buildSystemPrompt } from '../../src/extension/background/agent/prompt';
import { resetSessionsForTests } from '../../src/extension/background/agent/session';
import { resetAiConfigCache } from '../../src/extension/background/llm';
import { storageService } from '../../src/extension/background/storage/service';
import {
  classifySavedDetail,
  formatSavedDetails,
  hasPlaceholder,
  substituteSavedDetails,
} from '../../src/extension/background/agent/saved-details';
import { AGENT_TOOL_DEFS } from '../../src/extension/background/agent/tools';
import { evaluatePolicy } from '../../src/extension/background/policy';
import { FillFormArgsSchema, type ToolResult } from '../../src/shared/tools';

type Script = (req: ModelStepRequest, step: number) => Partial<ModelStepResult>;

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

const call = (toolName: string, input: unknown, id = `c_${Math.random()}`) => ({
  toolCallId: id,
  toolName,
  input,
});

const okResult = (message = 'ok'): ToolResult => ({
  ok: true,
  outcome: { ok: true, message, data: { pageVersion: 1 } },
});

async function run(
  script: Script,
  extra: Partial<Parameters<typeof runModelLoop>[0]> = {},
  execTool = vi.fn<ExecTool>(async () => okResult())
) {
  const model = scriptedModel(script);
  const result = await runModelLoop({
    system: 'sys',
    history: [],
    userGoal: 'fill this form for me',
    callModel: model.callModel,
    execTool,
    onText: () => {},
    ...extra,
  });
  return { result, requests: model.requests, execTool };
}

describe('fill_form tool', () => {
  it('is exposed to the model as a single batch action', () => {
    const def = AGENT_TOOL_DEFS.fill_form;
    expect(def.kind).toBe('act');
    expect(def.contentTool).toBe('fill_form');
    expect(def.description).toMatch(/ONE step/);
  });

  it('accepts a batch of mixed control kinds', () => {
    const parsed = FillFormArgsSchema.safeParse({
      entries: [
        { target: 'fld:full-legal-name', kind: 'text', value: 'Abebe Bikila' },
        { target: 'fld:work-location', kind: 'choice', value: 'Remote' },
        { target: 'fld:terms', kind: 'checked', value: 'true' },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty batch', () => {
    expect(FillFormArgsSchema.safeParse({ entries: [] }).success).toBe(false);
  });

  it('is a low-risk action that never asks for confirmation', () => {
    expect(evaluatePolicy({ name: 'fill_form', args: { entries: [] } } as never)).toEqual({
      risk: 'low',
      allowed: true,
      requiresConfirmation: false,
    });
  });

  it('asks once, touching nothing, then fills the whole form in one step', async () => {
    const savedDetails = { fullName: 'Zenebech Tufa', email: 'zenebech@example.com' };

    // Turn 1: the only missing values are asked for together, and nothing is filled yet.
    const ask = await run(
      () => ({ text: 'I need two things:\n1. Experience level\n2. Work location' }),
      { savedDetails }
    );
    expect(ask.execTool).not.toHaveBeenCalled();
    expect(ask.result.text).toContain('1.');

    // Turn 2: the user's single reply completes the set, so one batch call does it all.
    const fill = await run(
      (_req, step) =>
        step === 0
          ? {
              toolCalls: [
                call('fill_form', {
                  entries: [
                    { target: 'fld:full-legal-name', kind: 'text', value: '{{saved:fullName}}' },
                    { target: 'fld:email', kind: 'text', value: '{{saved:email}}' },
                    { target: 'fld:experience', kind: 'choice', value: 'Senior' },
                    { target: 'fld:work-location', kind: 'choice', value: 'Remote' },
                  ],
                }),
              ],
            }
          : { text: 'Filled 4 fields. I have not submitted anything.' },
      {
        savedDetails,
        userGoal: 'Senior, and Remote',
        history: [
          { role: 'user', content: 'fill this form for me' },
          { role: 'assistant', content: 'I need two things: experience level and work location' },
        ],
      }
    );

    // One batch call, not one per field.
    expect(fill.execTool).toHaveBeenCalledTimes(1);
    const [tool, args] = fill.execTool.mock.calls[0]!;
    expect(tool).toBe('fill_form');
    const entries = (args as { entries: Array<{ value: string }> }).entries;
    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.value)).toEqual([
      'Zenebech Tufa',
      'zenebech@example.com',
      'Senior',
      'Remote',
    ]);
    expect(fill.result.text).toContain('not submitted');
  });
});

describe('saved details', () => {
  it('tells the model which details exist without ever showing the values', () => {
    const summary = formatSavedDetails({ fullName: 'Abebe Bikila', email: 'abebe@example.com' });
    expect(summary).toContain('fullName');
    expect(summary).toContain('email');
    expect(summary).not.toContain('Abebe');
    expect(summary).not.toContain('abebe@example.com');
  });

  it('keeps saved values out of the system prompt', () => {
    // A name that does not appear in the prompt's own worked examples.
    const prompt = buildSystemPrompt({
      pageState: 'Page: "Apply"',
      savedDetails: formatSavedDetails({ fullName: 'Zenebech Tufa', phone: '+251911000000' }),
    });
    expect(prompt).toContain('{{saved:');
    expect(prompt).not.toContain('Zenebech Tufa');
    expect(prompt).not.toContain('+251911000000');
  });

  it('says so when nothing is saved yet', () => {
    expect(formatSavedDetails({})).toBeUndefined();
    expect(buildSystemPrompt()).toContain('none saved yet');
  });

  it('substitutes a placeholder with the saved value', () => {
    const out = substituteSavedDetails('{{saved:email}}', { email: 'abebe@example.com' });
    expect(out).toEqual({ value: 'abebe@example.com', usedSaved: true, unknown: [] });
  });

  it('reports placeholders that name something unsaved', () => {
    const out = substituteSavedDetails('{{saved:nickname}}', { email: 'a@b.c' });
    expect(out.usedSaved).toBe(false);
    expect(out.unknown).toEqual(['nickname']);
    expect(hasPlaceholder(out.value)).toBe(true);
  });

  it('swaps saved values in before the field is filled, so the model never sees them', async () => {
    const { execTool } = await run(
      (_req, step) =>
        step === 0
          ? { toolCalls: [call('fill', { target: 'fld:email', value: '{{saved:email}}' })] }
          : { text: 'Done.' },
      { savedDetails: { email: 'abebe@example.com' } }
    );
    expect(execTool).toHaveBeenCalledWith('fill', {
      target: 'fld:email',
      value: 'abebe@example.com',
    });
  });

  it('substitutes inside a batch too', async () => {
    const { execTool } = await run(
      (_req, step) =>
        step === 0
          ? {
              toolCalls: [
                call('fill_form', {
                  entries: [
                    { target: 'fld:name', kind: 'text', value: '{{saved:fullName}}' },
                    { target: 'fld:note', kind: 'text', value: 'Typed by the user' },
                  ],
                }),
              ],
            }
          : { text: 'Done.' },
      { savedDetails: { fullName: 'Abebe Bikila' } }
    );
    const [, args] = execTool.mock.calls[0]!;
    expect((args as { entries: Array<{ value: string }> }).entries.map((e) => e.value)).toEqual([
      'Abebe Bikila',
      'Typed by the user',
    ]);
  });

  it('refuses a placeholder for an unsaved detail instead of typing it into the page', async () => {
    const { execTool, requests } = await run(
      (_req, step) =>
        step === 0
          ? { toolCalls: [call('fill', { target: 'fld:nick', value: '{{saved:nickname}}' })] }
          : { text: 'What nickname should I use?' },
      { savedDetails: { email: 'a@b.c' } }
    );
    expect(execTool).not.toHaveBeenCalled();
    const toolMessage = JSON.stringify(requests[1]!.messages);
    expect(toolMessage).toContain('NOT_SAVED');
  });

  it('does not reject a saved Amharic name as invented', async () => {
    const { execTool } = await run(
      (_req, step) =>
        step === 0
          ? { toolCalls: [call('fill', { target: 'fld:name', value: '{{saved:fullName}}' })] }
          : { text: 'Done.' },
      { savedDetails: { fullName: 'አበበ ቢቂላ' }, userGoal: 'fill the form' }
    );
    expect(execTool).toHaveBeenCalledWith('fill', {
      target: 'fld:name',
      value: 'አበበ ቢቂላ',
    });
  });

  it('still rejects an Amharic value the model invented on its own', async () => {
    const { execTool, requests } = await run(
      (_req, step) =>
        step === 0
          ? { toolCalls: [call('fill', { target: 'fld:name', value: 'አበበ ቢቂላ' })] }
          : { text: 'Which name should I use?' },
      { savedDetails: {}, userGoal: 'fill the form' }
    );
    expect(execTool).not.toHaveBeenCalled();
    expect(JSON.stringify(requests[1]!.messages)).toContain('VALUE_NOT_FROM_USER');
  });

  it('reports what was filled so it can be remembered', async () => {
    const onFilled = vi.fn();
    await run(
      (_req, step) =>
        step === 0
          ? {
              toolCalls: [
                call('fill_form', {
                  entries: [
                    { target: 'fld:email', kind: 'text', value: 'abebe@example.com' },
                    { target: 'fld:note', kind: 'text', value: 'Available from June' },
                  ],
                }),
              ],
            }
          : { text: 'Done.' },
      { onFilled }
    );
    expect(onFilled).toHaveBeenCalledWith([
      { target: 'fld:email', value: 'abebe@example.com' },
      { target: 'fld:note', value: 'Available from June' },
    ]);
  });
});

describe('remembering details across turns', () => {
  const FIELDS = [
    { handle: 'fld:full-legal-name', label: 'Full Legal Name', kind: 'text', required: true },
    { handle: 'fld:email-address', label: 'Email Address', kind: 'email', required: true },
    { handle: 'fld:password', label: 'Password', kind: 'password', sensitive: true },
    { handle: 'fld:cover-note', label: 'Cover note', kind: 'textarea' },
  ];

  function installChrome() {
    const local: Record<string, unknown> = {};
    const session: Record<string, unknown> = {};
    const area = (store: Record<string, unknown>) => ({
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
    });
    const sendMessage = vi.fn(async (_tab: number, msg: any) => {
      if (msg.type === 'content/ping') return { ok: true, runtime: 'content', isTederash: true };
      const c = msg.payload?.call;
      if (c?.name === 'page_state') {
        return {
          ok: true,
          data: { url: 'u', title: 'Apply', pageVersion: 1, headings: [], fields: FIELDS, buttons: [] },
        };
      }
      return { ok: true, outcome: { ok: true, message: `ran ${c?.name}`, data: { pageVersion: 2 } } };
    });
    (globalThis as any).chrome = {
      tabs: { sendMessage },
      storage: { local: area(local), session: area(session) },
    };
    return { local, sendMessage };
  }

  beforeEach(() => {
    resetSessionsForTests();
    resetAiConfigCache();
  });

  it('saves the identity values it filled, and not the one-off answer', async () => {
    installChrome();
    const callModel: CallModel = async (req) => {
      if (!req.messages.some((m) => m.role === 'tool')) {
        return {
          text: '',
          toolCalls: [
            {
              toolCallId: 'c1',
              toolName: 'fill_form',
              input: {
                entries: [
                  { target: 'fld:full-legal-name', kind: 'text', value: 'Zenebech Tufa' },
                  { target: 'Email Address', kind: 'text', value: 'zenebech@example.com' },
                  { target: 'fld:cover-note', kind: 'text', value: 'I am keen on this role.' },
                ],
              },
            },
          ],
        };
      }
      req.onText('Done.');
      return { text: 'Done.', toolCalls: [] };
    };

    await runAgentTaskStream(7, 'fill this form', undefined, undefined, undefined, { callModel });

    expect(await storageService.getVault()).toEqual({
      fullName: 'Zenebech Tufa',
      email: 'zenebech@example.com',
    });
  });

  it('offers the saved names, not the values, on the next turn', async () => {
    installChrome();
    await storageService.setVault({ fullName: 'Zenebech Tufa', email: 'zenebech@example.com' });

    const systems: string[] = [];
    const callModel: CallModel = async (req) => {
      systems.push(req.system);
      req.onText('Nothing to do.');
      return { text: 'Nothing to do.', toolCalls: [] };
    };

    await runAgentTaskStream(8, 'what does this form need?', undefined, undefined, undefined, { callModel });

    expect(systems[0]).toContain('SAVED DETAILS');
    expect(systems[0]).toContain('fullName');
    expect(systems[0]).not.toContain('Zenebech Tufa');
    expect(systems[0]).not.toContain('zenebech@example.com');
  });
});

describe('classifySavedDetail', () => {
  it('recognises the identity fields worth remembering', () => {
    expect(classifySavedDetail('Email Address', 'email')).toBe('email');
    expect(classifySavedDetail('E-mail')).toBe('email');
    expect(classifySavedDetail('Phone number', 'tel')).toBe('phone');
    expect(classifySavedDetail('Mobile')).toBe('phone');
    expect(classifySavedDetail('Full Legal Name')).toBe('fullName');
    expect(classifySavedDetail('Name')).toBe('fullName');
    expect(classifySavedDetail('Street address')).toBe('address');
  });

  it('reads "Email Address" as an email, not an address', () => {
    expect(classifySavedDetail('Email Address')).toBe('email');
  });

  it('leaves one-off and non-personal fields alone', () => {
    expect(classifySavedDetail('Cover note')).toBeUndefined();
    expect(classifySavedDetail('Experience level')).toBeUndefined();
    expect(classifySavedDetail('Company name')).toBeUndefined();
    expect(classifySavedDetail('Username')).toBeUndefined();
    expect(classifySavedDetail('Why do you want this role?')).toBeUndefined();
    expect(classifySavedDetail('')).toBeUndefined();
  });

  it('does not treat a separate First/Last name box as the full name', () => {
    expect(classifySavedDetail('First name')).toBeUndefined();
    expect(classifySavedDetail('Last name')).toBeUndefined();
    expect(classifySavedDetail('Family name')).toBeUndefined();
  });
});
