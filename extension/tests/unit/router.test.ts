import { describe, expect, it } from 'vitest';
import { ROUTER_HELP, ROUTER_HELP_AM, createRouterCallModel, routeIntent } from '../../src/extension/background/agent/router';
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

  it.each([
    // value first, then the field with በ … ውስጥ
    ['አበበ ቢቂላን በሙሉ ስም መስክ ውስጥ አስገባ', { tool: 'fill', args: { target: 'ሙሉ ስም', value: 'አበበ ቢቂላ' } }],
    // field first, then the value; polite prefix, Ethiopic full stop
    ['እባክዎ በሙሉ ስም መስክ ውስጥ ጸጋዬ ሸዋማሬ ይጻፉ።', { tool: 'fill', args: { target: 'ሙሉ ስም', value: 'ጸጋዬ ሸዋማሬ' } }],
    ['ኢሜይል ላይ abebe@example.com ጻፍ', { tool: 'fill', args: { target: 'ኢሜይል', value: 'abebe@example.com' } }],
    ['ሙሉ ስምን አበበ ቢቂላ ብለህ ሙላ', { tool: 'fill', args: { target: 'ሙሉ ስም', value: 'አበበ ቢቂላ' } }],
    ['ኢሜይሉን ወደ tsegaye@example.com ቀይር', { tool: 'fill', args: { target: 'ኢሜይሉ', value: 'tsegaye@example.com' } }],
    ['ለሥራ ቦታ ርቀት ምረጥ', { tool: 'choose', args: { target: 'ሥራ ቦታ', option: 'ርቀት' } }],
    ['የውል ሳጥኑን ምልክት አድርግ', { tool: 'set_checked', args: { target: 'ውል', checked: true } }],
    ['ጋዜጣ ምልክት አንሳ', { tool: 'set_checked', args: { target: 'ጋዜጣ', checked: false } }],
    ['ቀጣይ የሚለውን ተጫን', { tool: 'click', args: { target: 'ቀጣይ' } }],
    ['ማመልከቻ አስገባ ቁልፉን ይጫኑ', { tool: 'click', args: { target: 'ማመልከቻ አስገባ' } }],
    ['ወደ ታች ውረድ', { tool: 'scroll', args: { direction: 'down' } }],
    ['ወደ ላይ ሸብልል', { tool: 'scroll', args: { direction: 'up' } }],
    ['ወደ መጨረሻው ሂድ', { tool: 'scroll', args: { direction: 'bottom' } }],
    ['ጽሑፉን አሳድግ', { tool: 'set_preferences', args: { fontScale: 1.25 } }],
    ['ፊደሉን ትንሽ አድርግ', { tool: 'set_preferences', args: { fontScale: 1 } }],
    ['ከፍተኛ ንፅፅር አብራ', { tool: 'set_preferences', args: { highContrast: true } }],
    ['ቀላል ቋንቋ ተጠቀም', { tool: 'set_preferences', args: { simplifiedLanguage: true, showInstructions: true } }],
    ['ቁልፎቹን አሳድግ', { tool: 'set_preferences', args: { targetSize: 'large' } }],
    ['ገጹን አንብብልኝ', { tool: 'read_page', args: { detail: 'summary' } }],
    ['ይህ ገጽ ምንድን ነው?', { tool: 'read_page', args: { detail: 'summary' } }],
  ])('Amharic: %s', (text, expected) => {
    expect(routeIntent(text, PAGE)).toEqual({ kind: 'tool', ...expected });
  });

  it('Amharic: uses the Page Model to split a field name from an option and to pick a choice field', () => {
    const page: PageState = {
      ...PAGE,
      fields: [
        { handle: 'fld:a', label: 'የሥራ ቦታ ምርጫ', kind: 'combobox', options: ['ርቀት', 'ድቅል (አዲስ አበባ)', 'ቢሮ'] },
        { handle: 'fld:b', label: 'የሥራ ቦታ', kind: 'text' },
      ],
    };
    expect(routeIntent('ለሥራ ቦታ ምርጫ ድቅል (አዲስ አበባ) ምረጥ', page)).toEqual({
      kind: 'tool',
      tool: 'choose',
      args: { target: 'ሥራ ቦታ ምርጫ', option: 'ድቅል (አዲስ አበባ)' },
    });
    expect(routeIntent('ርቀትን ምረጥ', page)).toEqual({ kind: 'tool', tool: 'choose', args: { target: 'የሥራ ቦታ ምርጫ', option: 'ርቀት' } });
    // "change X to Y" becomes a choose when X is a select on the page
    expect(routeIntent('የሥራ ቦታ ምርጫን ወደ ቢሮ ቀይር', page)).toEqual({
      kind: 'tool',
      tool: 'choose',
      args: { target: 'ሥራ ቦታ ምርጫ', option: 'ቢሮ' },
    });
  });

  it('Amharic: answers form questions from the Page Model in Amharic', () => {
    const res = routeIntent('ይህ ቅጽ ምን ይጠይቃል?', PAGE);
    expect(res?.kind).toBe('answer');
    if (res?.kind === 'answer') {
      expect(res.text).toContain('ይህ ቅጽ 3 መስኮች አሉት፣ 2 ግዴታ');
      expect(res.text).toContain('**Email Address** (ግዴታ; አሁን “a@b.co”)');
    }
    expect(routeIntent('ስለ ሥራ ዕድገቴ የሽፋን ደብዳቤ ጻፍልኝ', PAGE)).toBeUndefined();
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

  it('answers in Amharic when the request was Amharic', async () => {
    const help = await createRouterCallModel('ግጥም ጻፍልኝ', PAGE)({ system: '', messages: [], tools: {}, toolChoice: 'auto', onText: () => {} });
    expect(help.text).toBe(ROUTER_HELP_AM);

    const callModel = createRouterCallModel('በሙሉ ስም መስክ ውስጥ አበበ ቢቂላ አስገባ', PAGE);
    const first = await callModel({ system: '', messages: [], tools: {}, toolChoice: 'auto', onText: () => {} });
    expect(first.toolCalls[0]).toMatchObject({ toolName: 'fill', input: { target: 'ሙሉ ስም', value: 'አበበ ቢቂላ' } });
    const second = await callModel({
      system: '',
      messages: [
        { role: 'user', content: 'x' },
        { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'router_1', toolName: 'fill', output: { type: 'json', value: { ok: true, summary: 'ሙሉ ስም = "አበበ ቢቂላ"' } } }] },
      ],
      tools: {},
      toolChoice: 'auto',
      onText: () => {},
    });
    expect(second.text).toBe('ተከናውኗል — ሙሉ ስም = "አበበ ቢቂላ"።');
  });
});
