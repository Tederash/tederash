import { describe, expect, it, vi } from 'vitest';
import {
  type CallModel,
  type ExecTool,
  type ModelStepRequest,
  type ModelStepResult,
  runModelLoop,
} from '../../src/extension/background/agent/loop';
import { buildSystemPrompt } from '../../src/extension/background/agent/prompt';
import { AGENT_TOOL_DEFS, getAgentTools } from '../../src/extension/background/agent/tools';
import { formatPageState } from '../../src/extension/background/agent/page-model';
import { ToolCallSchema, type PageState, type ToolResult } from '../../src/shared/tools';

/**
 * The assistant is strictly reactive: it answers or acts, then stops. It has no way
 * to ask the user a question in order to continue — that capability was removed, not
 * just discouraged, so these tests assert the absence of the machinery as well as the
 * wording of the contract.
 */

const page = (over: Partial<PageState> = {}): PageState => ({
  url: 'https://example.test/jobs',
  title: 'Role Application',
  pageVersion: 1,
  headings: [],
  fields: [],
  buttons: [],
  ...over,
});

function scriptedModel(script: (req: ModelStepRequest, step: number) => Partial<ModelStepResult>) {
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

const okResult = (over: Partial<ToolResult & { outcome: unknown }> = {}): ToolResult =>
  ({
    ok: true,
    outcome: { ok: true, message: 'done', data: { pageVersion: 2 } },
    ...over,
  }) as ToolResult;

describe('the agent cannot ask the user anything', () => {
  it('has no listen tool to ask with', () => {
    expect('listen' in AGENT_TOOL_DEFS).toBe(false);
    expect(Object.keys(getAgentTools({ voiceTurn: true }))).not.toContain('listen');
  });

  it('rejects a listen call at the protocol level, not just the prompt', () => {
    expect(ToolCallSchema.safeParse({ name: 'listen', args: { prompt: 'Which one?' } }).success).toBe(
      false
    );
  });

  it('tells a model that tries it that no such tool exists', async () => {
    const execTool = vi.fn<ExecTool>(async () => okResult());
    const model = scriptedModel((_req, step) =>
      step === 0
        ? { toolCalls: [{ toolCallId: 'c1', toolName: 'listen', input: { prompt: 'Your email?' } }] }
        : { text: 'I need your email address.' }
    );
    const result = await runModelLoop({
      system: 'sys',
      history: [],
      userGoal: 'fill the form',
      callModel: model.callModel,
      execTool,
      onText: () => {},
    });

    expect(execTool).not.toHaveBeenCalled();
    expect(JSON.stringify(model.requests[1]!.messages)).toContain('UNKNOWN_TOOL');
    expect(result.text).toContain('email');
  });

  it('offers say only on spoken turns, and nothing else voice-related', () => {
    expect(Object.keys(getAgentTools({ voiceTurn: false }))).not.toContain('say');
    expect(Object.keys(getAgentTools({ voiceTurn: true }))).toContain('say');
  });
});

describe('the prompt contract', () => {
  const prompt = buildSystemPrompt();

  it('forbids follow-up questions outright', () => {
    expect(prompt).toMatch(/NEVER ask the user a question in order to carry on/);
    expect(prompt).toMatch(/One request, one response/);
  });

  it('asks it to name missing fields rather than request them', () => {
    expect(prompt).toMatch(/Do not ask for those values/);
    expect(prompt).toMatch(/single fill_form call/);
  });

  it('asks it to describe what an action opened, then stop', () => {
    expect(prompt).toMatch(/DESCRIBE what is now on screen/);
    expect(prompt).toMatch(/Do not decide what to press next/);
  });

  it('keeps the no-follow-up rule on spoken turns too', () => {
    const spoken = buildSystemPrompt({ isVoiceTurn: true });
    expect(spoken).toMatch(/do not ask them anything to carry on/i);
    expect(spoken).toMatch(/calling say/);
  });

  it('never tells it to ask for an unsaved detail', () => {
    const withSaved = buildSystemPrompt({ savedDetails: 'email, fullName' });
    expect(withSaved).toMatch(/name the field and stop\. Do not ask for the value/);
    expect(buildSystemPrompt({ savedDetails: undefined })).toMatch(/do not ask for the values/);
  });
});

describe('reporting what an action changed', () => {
  it('re-reads the page after a click that opened a dialog, so it can be described', async () => {
    const readPageState = vi.fn(async () =>
      page({ dialog: { title: 'Confirm application', text: 'Send your application now?' } })
    );
    const model = scriptedModel((_req, step) =>
      step === 0
        ? { toolCalls: [{ toolCallId: 'c1', toolName: 'click', input: { target: 'Apply' } }] }
        : { text: 'A dialog opened.' }
    );

    await runModelLoop({
      system: 'sys',
      history: [],
      userGoal: 'click apply',
      callModel: model.callModel,
      execTool: vi.fn<ExecTool>(async () =>
        okResult({ outcome: { ok: true, message: 'clicked', domChanged: true, data: { pageVersion: 2 } } })
      ),
      onText: () => {},
      readPageState,
    });

    expect(readPageState).toHaveBeenCalled();
    const toolMessage = JSON.stringify(model.requests[1]!.messages);
    expect(toolMessage).toContain('OPEN DIALOG');
    expect(toolMessage).toContain('Confirm application');
    expect(toolMessage).toContain('Send your application now?');
  });

  it('does not re-read the page after a perception call that changed nothing', async () => {
    const readPageState = vi.fn(async () => page());
    const model = scriptedModel((_req, step) =>
      step === 0
        ? { toolCalls: [{ toolCallId: 'c1', toolName: 'read_page', input: {} }] }
        : { text: 'The page is a job ad.' }
    );

    await runModelLoop({
      system: 'sys',
      history: [],
      userGoal: 'what does this page say',
      callModel: model.callModel,
      execTool: vi.fn<ExecTool>(async () => okResult({ outcome: { ok: true, message: 'read' } })),
      onText: () => {},
      readPageState,
    });

    expect(readPageState).not.toHaveBeenCalled();
  });
});

describe('formatPageState', () => {
  it('puts an open dialog first, since it is what the user is looking at', () => {
    const text = formatPageState(
      page({
        dialog: { title: 'Confirm application', text: 'Send your application now?' },
        headings: ['Role Application'],
      })
    );
    const lines = text.split('\n');
    expect(lines[1]).toContain('OPEN DIALOG: "Confirm application"');
    expect(lines[1]).toContain('Send your application now?');
  });

  it('says nothing about dialogs when none is open', () => {
    expect(formatPageState(page())).not.toContain('OPEN DIALOG');
  });
});
