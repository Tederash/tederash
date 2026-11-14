import { describe, expect, it } from 'vitest';
import { ROUTER_HELP, createRouterCallModel, routeIntent } from '../../src/extension/background/agent/router';
import type { PageState } from '../../src/shared/tools';

const PAGE: PageState = {
  url: 'u',
  title: 'Jobs',
  pageVersion: 1,
  headings: [],
  fields: [
    { handle: 'fld:full-legal-name', label: 'Full Legal Name', kind: 'text', required: true },
    { handle: 'fld:work-location-preference', label: 'Work Location Preference', kind: 'combobox', options: [] },
    { handle: 'fld:email-address', label: 'Email Address', kind: 'email', required: true, value: 'a@b.co' },
  ],
  buttons: [],
};

describe('routeIntent', () => {
  it.each([
    ["insert 'Tsegaye Shewamare' in the Full Name field.", { tool: 'fill', args: { target: 'Full Name', value: 'Tsegaye Shewamare' } }],
    ['type abebe@example.com into email', { tool: 'fill', args: { target: 'email', value: 'abebe@example.com' } }],
    ['fill the email field with x@y.z', { tool: 'fill', args: { target: 'email', value: 'x@y.z' } }],
    ['now change the email to tsegaye@example.com', { tool: 'fill', args: { target: 'email', value: 'tsegaye@example.com' } }],
    ['set my work location preference to Remote', { tool: 'choose', args: { target: 'work location preference', option: 'Remote' } }],
    ['choose Staff for seniority', { tool: 'choose', args: { target: 'seniority', option: 'Staff' } }],
    ['check the terms box', { tool: 'set_checked', args: { target: 'terms', checked: true } }],
    ['uncheck newsletter', { tool: 'set_checked', args: { target: 'newsletter', checked: false } }],
    ['click the Submit application button', { tool: 'click', args: { target: 'Submit application' } }],
    ['scroll down', { tool: 'scroll', args: { direction: 'down' } }],
    ['make the text bigger', { tool: 'set_preferences', args: { fontScale: 1.25 } }],
    ['turn on high contrast', { tool: 'set_preferences', args: { highContrast: true } }],
    ['read this page', { tool: 'read_page', args: { detail: 'summary' } }],
  ])('%s', (text, expected) => {
    expect(routeIntent(text, PAGE)).toEqual({ kind: 'tool', ...expected });
  });

  it('answers form questions from the Page Model', () => {
    const res = routeIntent('what does this form ask?', PAGE);
    expect(res?.kind).toBe('answer');
    if (res?.kind === 'answer') {
      expect(res.text).toContain('This form has 3 fields, 2 required');
      expect(res.text).toContain('**Email Address** (required; currently “a@b.co”)');
    }
  });

  it('returns nothing for requests it does not understand', () => {
    expect(routeIntent('write me a cover letter about my career goals', PAGE)).toBeUndefined();
  });
});

describe('createRouterCallModel', () => {
  it('emits one tool call, then a short answer from the tool result', async () => {
    const callModel = createRouterCallModel("insert 'A B' in the Full Name field", PAGE);
    let streamed = '';
    const first = await callModel({ system: '', messages: [], tools: {}, toolChoice: 'auto', onText: (t) => (streamed += t) });
    expect(first.toolCalls).toEqual([{ toolCallId: 'router_1', toolName: 'fill', input: { target: 'Full Name', value: 'A B' } }]);
    const second = await callModel({
      system: '',
      messages: [
        { role: 'user', content: 'x' },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'router_1', toolName: 'fill', output: { type: 'json', value: { ok: true, summary: 'Full Legal Name = "A B"' } } }] },
      ],
      tools: {},
      toolChoice: 'auto',
      onText: (t) => (streamed += t),
    });
    expect(second.text).toBe('Done — Full Legal Name = "A B".');
    expect(streamed).toBe(second.text);
  });

  it('explains what it can do when it does not understand', async () => {
    const res = await createRouterCallModel('compose a poem', PAGE)({ system: '', messages: [], tools: {}, toolChoice: 'auto', onText: () => {} });
    expect(res.text).toBe(ROUTER_HELP);
  });
});
