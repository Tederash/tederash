import { describe, expect, it, vi } from 'vitest';
import {
  classifyReply,
  guidedLangFor,
  matchOption,
  normalizeAnswer,
  promptFor,
  runGuidedFill,
  spellOut,
  type GuidedDeps,
} from '../../src/components/sidepanel/guidedFill';
import type { PageField, PageState, ToolResult } from '../../src/shared/tools';

const PAGE: PageState = {
  url: 'u',
  title: 'Apply',
  pageVersion: 1,
  headings: [],
  fields: [
    { handle: 'fld:full-name', label: 'Full name *', kind: 'text', required: true },
    { handle: 'fld:email', label: 'Email', kind: 'email', required: true },
    { handle: 'fld:password', label: 'Password', kind: 'password', sensitive: true },
    { handle: 'fld:location', label: 'Work location', kind: 'select', options: ['Pick one', 'Remote', 'Hybrid (Addis Ababa)', 'On-site'] },
    { handle: 'fld:terms', label: 'I agree to the terms', kind: 'checkbox', required: true },
  ],
  buttons: [{ handle: 'btn:submit', label: 'Submit application', kind: 'button', submit: true }],
};

const ok = (message = 'ok'): ToolResult => ({ ok: true, outcome: { ok: true, message } });

function script(replies: Array<string | undefined>, opts: Partial<GuidedDeps> = {}) {
  const spoken: string[] = [];
  const queue = [...replies];
  const exec = vi.fn<GuidedDeps['exec']>(async () => ok());
  const deps: GuidedDeps = {
    lang: 'en',
    speak: async (t) => {
      spoken.push(t);
    },
    listen: async () => (queue.length ? queue.shift() : 'stop'),
    exec,
    getPageState: async () => PAGE,
    onState: () => {},
    ...opts,
  };
  return { deps, spoken, exec, queue };
}

describe('guided fill helpers', () => {
  it('classifies short commands and yes/no in en, am and om; longer speech is a value', () => {
    expect(classifyReply('Yes.')).toBe('yes');
    expect(classifyReply("that's right")).toBe('yes');
    expect(classifyReply('አዎ')).toBe('yes');
    expect(classifyReply('eeyyee')).toBe('yes');
    expect(classifyReply('ተሳስቷል')).toBe('no');
    expect(classifyReply('skip')).toBe('skip');
    expect(classifyReply("irra deebi'i")).toBe('repeat');
    expect(classifyReply("deebi'i")).toBe('back');
    expect(classifyReply('Abebe Bikila')).toBe('value');
    expect(classifyReply('my name is not stop words here today')).toBe('value');
  });

  it('spells Latin letter by letter, email with at/dot, and Ethiopic by syllable', () => {
    expect(spellOut('Abebe', 'en')).toBe('A, B, E, B, E');
    expect(spellOut('a.b@x.co', 'en')).toBe('A, dot, B, at, X, dot, C, O');
    expect(spellOut('አበበ ቢቂላ', 'am')).toBe('አ, በ, በ; ክፍተት; ቢ, ቂ, ላ');
  });

  it('normalises spoken email and phone, and matches options loosely', () => {
    const email: PageField = { handle: 'e', label: 'Email', kind: 'email' };
    const tel: PageField = { handle: 't', label: 'Phone', kind: 'tel' };
    expect(normalizeAnswer(email, 'abebe at example dot com')).toBe('abebe@example.com');
    expect(normalizeAnswer(tel, '0911 23 45 67')).toBe('0911234567');
    expect(normalizeAnswer({ handle: 'n', label: 'Name', kind: 'text' }, 'Abebe Bikila.')).toBe('Abebe Bikila');
    expect(normalizeAnswer({ handle: 'n', label: 'ስም', kind: 'text' }, 'አበበ ቢቂላ።')).toBe('አበበ ቢቂላ');
    expect(matchOption(['Pick one', 'Remote', 'Hybrid (Addis Ababa)'], 'hybrid')).toBe('Hybrid (Addis Ababa)');
    expect(matchOption(['Pick one', 'Remote'], 'pick one')).toBeUndefined();
  });

  it('builds prompts with required state, options and current values', () => {
    expect(promptFor(PAGE.fields[0]!, 'en')).toBe('Full name. Required. Please say your answer.');
    expect(promptFor(PAGE.fields[3]!, 'en')).toContain('The options are: Remote, Hybrid (Addis Ababa), On-site.');
    expect(promptFor({ ...PAGE.fields[1]!, value: 'a@b.co' }, 'en')).toContain('It currently says a@b.co.');
    expect(guidedLangFor('am-ET')).toBe('am');
    expect(guidedLangFor('om-ET')).toBe('om');
  });
});

describe('runGuidedFill', () => {
  it('asks, spells back, and fills only after yes; corrections are re-spelled; submit needs a yes', async () => {
    const { deps, spoken, exec } = script([
      'Abebe Bikla', // name: misheard
      'Abebe Bikila', // correction instead of yes/no
      'yes',
      'abebe at example dot com', // email
      'yes',
      'done', // password typed by the user
      'hybrid', // location
      'yes',
      'yes', // terms ticked
      'yes', // submit
    ]);
    const res = await runGuidedFill(deps);
    expect(res).toEqual({ filled: 4, stopped: false });
    expect(exec.mock.calls).toEqual([
      ['fill', { target: 'fld:full-name', value: 'Abebe Bikila' }],
      ['fill', { target: 'fld:email', value: 'abebe@example.com' }],
      ['choose', { target: 'fld:location', option: 'Hybrid (Addis Ababa)' }],
      ['set_checked', { target: 'fld:terms', checked: true }],
      ['click', { target: 'btn:submit' }, true],
    ]);
    // Never filled the misheard version; it was read back and corrected first.
    expect(spoken.some((s) => s.includes('I heard Abebe Bikla'))).toBe(true);
    expect(spoken.some((s) => s.includes('A, B, E, B, E; space; B, I, K, I, L, A'))).toBe(true);
    // The password is never asked or spoken back.
    expect(spoken.some((s) => s.includes('Password is private'))).toBe(true);
    expect(exec.mock.calls.some(([, args]) => args.target === 'fld:password')).toBe(false);
  });

  it('re-asks on a bare yes to an open question and on an implausible email, without filling', async () => {
    const page: PageState = { ...PAGE, fields: [PAGE.fields[0]!, PAGE.fields[1]!], buttons: [] };
    const { deps, exec, spoken } = script(['yes', 'Abebe', 'yes', 'hybrid', 'abebe at example dot com', 'yes'], {
      getPageState: async () => page,
    });
    await runGuidedFill(deps);
    expect(exec.mock.calls).toEqual([
      ['fill', { target: 'fld:full-name', value: 'Abebe' }],
      ['fill', { target: 'fld:email', value: 'abebe@example.com' }],
    ]);
    expect(spoken.some((s) => s.startsWith('That does not sound like an email address'))).toBe(true);
  });

  it('"no" re-asks, skip moves on, back returns, stop ends without filling', async () => {
    const { deps, exec, spoken } = script(['Abebe', 'no', 'skip', 'back', 'stop']);
    const res = await runGuidedFill(deps);
    expect(res.stopped).toBe(true);
    expect(exec).not.toHaveBeenCalled();
    expect(spoken.filter((s) => s.startsWith('Full name.')).length).toBe(2); // asked again after "back"
  });

  it('does not submit without a yes, and re-asks a field when the page reports a validation error', async () => {
    const exec = vi
      .fn<GuidedDeps['exec']>()
      .mockResolvedValueOnce({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email' } })
      .mockResolvedValue(ok());
    const page: PageState = { ...PAGE, fields: [PAGE.fields[1]!] };
    const { deps, spoken } = script(['abc at x dot co', 'yes', 'abd at x dot co', 'yes', 'no'], { exec, getPageState: async () => page });
    await runGuidedFill(deps);
    expect(spoken.some((s) => s.includes('That did not work: Enter a valid email'))).toBe(true);
    expect(exec).toHaveBeenLastCalledWith('fill', { target: 'fld:email', value: 'abd@x.co' });
    expect(spoken.at(-1)).toContain('I did not submit');
  });
});
