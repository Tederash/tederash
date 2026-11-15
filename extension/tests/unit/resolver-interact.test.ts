import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { choose, clickTarget, fill, fillForm, setChecked } from '../../src/extension/content/interact';
import { buildPageState, resolveTarget } from '../../src/extension/content/resolver';
import { formatPageState, toModelToolOutput } from '../../src/extension/background/agent/page-model';

beforeAll(() => {
  // jsdom has no layout: make every element "visible" with a non-zero box.
  Element.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
  Element.prototype.scrollIntoView = function () {};
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

const FORM = `
  <main>
    <h1>Role Application</h1>
    <form>
      <label for="n">Full Legal Name *</label><input id="n" required>
      <label for="e">Email Address</label><input id="e" type="email" required aria-invalid="true" aria-describedby="e-err">
      <p id="e-err">Enter a valid email</p>
      <label for="p">Password</label><input id="p" type="password">
      <label for="s">Seniority</label>
      <select id="s"><option value="">Pick one</option><option value="sr">Senior</option><option value="st">Staff</option></select>
      <fieldset><legend>Work location</legend>
        <label><input type="radio" name="loc" value="r"> Remote</label>
        <label><input type="radio" name="loc" value="o"> On-site</label>
      </fieldset>
      <label><input type="checkbox" id="t"> I agree to the terms</label>
      <input type="hidden" name="csrf" value="x">
      <div aria-hidden="true"><input id="ghost" aria-label="Ghost"></div>
      <button type="submit">Submit application</button>
    </form>
  </main>`;

describe('Page Model', () => {
  beforeEach(() => {
    document.body.innerHTML = FORM;
  });

  it('lists visible fields with stable handles, requirement, errors and options', () => {
    const state = buildPageState();
    const byLabel = Object.fromEntries(state.fields.map((f) => [f.label, f]));
    expect(Object.keys(byLabel)).toEqual([
      'Full Legal Name',
      'Email Address',
      'Password',
      'Seniority',
      'Work location',
      'I agree to the terms',
    ]);
    expect(byLabel['Full Legal Name']).toMatchObject({ handle: 'fld:full-legal-name', kind: 'text', required: true });
    expect(byLabel['Email Address']).toMatchObject({ kind: 'email', error: 'Enter a valid email' });
    expect(byLabel['Password']).toMatchObject({ sensitive: true, filled: false });
    expect(byLabel['Seniority']!.options).toEqual(['Pick one', 'Senior', 'Staff']);
    expect(byLabel['Work location']).toMatchObject({ kind: 'radio', options: ['Remote', 'On-site'] });
    expect(state.buttons.map((b) => [b.handle, b.submit])).toEqual([['btn:submit-application', true]]);
    // Same DOM, same handles (handles survive across turns without stored pointers).
    expect(buildPageState().fields.map((f) => f.handle)).toEqual(state.fields.map((f) => f.handle));
  });

  it('formats a compact PAGE STATE block for the model', () => {
    const text = formatPageState(buildPageState());
    expect(text).toContain('- fld:full-legal-name | Full Legal Name | text | required | empty');
    expect(text).toContain('ERROR: Enter a valid email');
    expect(text).toContain('empty (private — user must fill)');
    expect(text).toContain('- btn:submit-application | Submit application | submits form');
  });
});

describe('resolveTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = FORM;
  });

  it.each([
    ['fld:full-legal-name', 'Full Legal Name'],
    ['Full Name', 'Full Legal Name'],
    ['the full name field', 'Full Legal Name'],
    ['email', 'Email Address'],
    ['“Email Address”', 'Email Address'],
    ['terms', 'I agree to the terms'],
  ])('resolves %s → %s', (target, label) => {
    const res = resolveTarget(target, 'field');
    expect(res.status).toBe('RESOLVED');
    if (res.status === 'RESOLVED') expect(res.entry.info.label).toBe(label);
  });

  it('reports ambiguity with candidates instead of guessing', () => {
    document.body.innerHTML = `<label for="a">First name</label><input id="a"><label for="b">Last name</label><input id="b">`;
    const res = resolveTarget('name', 'field');
    expect(res.status).toBe('AMBIGUOUS');
    if (res.status !== 'RESOLVED') expect(res.candidates.map((c) => c.label).sort()).toEqual(['First name', 'Last name']);
  });

  it('reports not found', () => {
    expect(resolveTarget('passport number', 'field').status).not.toBe('RESOLVED');
  });
});

describe('interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = FORM;
  });

  it('fill updates a React 18 controlled input (state, not just the DOM)', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    function Controlled() {
      const [name, setName] = React.useState('');
      return React.createElement(
        'form',
        null,
        React.createElement('label', { htmlFor: 'n' }, 'Full Legal Name'),
        React.createElement('input', { id: 'n', value: name, onChange: (e: any) => setName(e.target.value) }),
        React.createElement('output', { 'data-testid': 'echo' }, name)
      );
    }
    const root = createRoot(document.getElementById('root')!);
    await act(async () => root.render(React.createElement(Controlled)));

    let res: Awaited<ReturnType<typeof fill>> | undefined;
    await act(async () => {
      res = await fill({ target: 'Full Name', value: 'Tsegaye Shewamare' });
    });
    expect(res?.ok).toBe(true);
    expect(document.querySelector('output')?.textContent).toBe('Tsegaye Shewamare');
    await act(async () => root.unmount());
  });

  it('fill refuses password fields and reports validation errors after typing', async () => {
    const pw = await fill({ target: 'Password', value: 'secret' });
    expect(pw).toMatchObject({ ok: false, error: { code: 'POLICY_BLOCKED' } });
    expect((document.getElementById('p') as HTMLInputElement).value).toBe('');

    const email = await fill({ target: 'email', value: 'not-an-email' });
    expect(email).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect((document.getElementById('e') as HTMLInputElement).value).toBe('not-an-email');
  });

  it('fill returns candidates when the target is unknown', async () => {
    const res = await fill({ target: 'passport number', value: 'x' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(['NOT_FOUND', 'AMBIGUOUS']).toContain(res.error.code);
  });

  it('choose picks native select options and radio options', async () => {
    expect((await choose({ target: 'Seniority', option: 'staff' })).ok).toBe(true);
    expect((document.getElementById('s') as HTMLSelectElement).value).toBe('st');
    expect((await choose({ target: 'Work location', option: 'remote' })).ok).toBe(true);
    expect((document.querySelector('input[value="r"]') as HTMLInputElement).checked).toBe(true);
    const missing = await choose({ target: 'Seniority', option: 'Intern' });
    expect(missing).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('set_checked is idempotent', async () => {
    const box = document.getElementById('t') as HTMLInputElement;
    expect((await setChecked({ target: 'terms', checked: true })).ok).toBe(true);
    expect(box.checked).toBe(true);
    await setChecked({ target: 'terms', checked: true });
    expect(box.checked).toBe(true);
    await setChecked({ target: 'terms', checked: false });
    expect(box.checked).toBe(false);
  });

  it('click activates exactly once', async () => {
    document.body.innerHTML = '<button id="b">Add another</button>';
    let clicks = 0;
    document.getElementById('b')!.addEventListener('click', () => clicks++);
    expect((await clickTarget('Add another')).ok).toBe(true);
    expect(clicks).toBe(1);
  });
});

describe('model tool output', () => {
  it('keeps action results short and passes candidates on failure', () => {
    expect(toModelToolOutput('fill', { ok: true, data: { big: 'x'.repeat(1000) }, outcome: { ok: true, message: 'Full Legal Name = "A"' } })).toEqual({
      ok: true,
      summary: 'Full Legal Name = "A"',
    });
    expect(
      toModelToolOutput('fill', { ok: false, error: { code: 'AMBIGUOUS', message: 'm', candidates: [{ handle: 'fld:a', label: 'A', score: 0.9 }] } })
    ).toMatchObject({ ok: false, code: 'AMBIGUOUS', candidates: [{ handle: 'fld:a' }] });
  });
});

describe('Tederash bridge path', () => {
  function respondAsPage(handler: (payload: any) => boolean) {
    const calls: any[] = [];
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type !== 'tederash:interact') return;
      calls.push(detail.payload);
      const ok = handler(detail.payload);
      window.dispatchEvent(new CustomEvent('tederash:response', { detail: { id: detail.id, ok } }));
    };
    window.addEventListener('tederash:request', listener);
    return { calls, stop: () => window.removeEventListener('tederash:request', listener) };
  }

  beforeEach(() => {
    document.documentElement.setAttribute('data-tederash-root', 'true');
    document.body.innerHTML = `
      <label for="n">Full Legal Name</label><input id="n" data-tederash-id="name-1">
      <label><input type="checkbox" id="t" data-tederash-id="terms-1"> I agree</label>`;
  });

  it('asks the page component first (fill / setChecked) and verifies the result', async () => {
    const page = respondAsPage((p) => {
      const el = document.querySelector<HTMLInputElement>(`[data-tederash-id="${p.id}"]`)!;
      if (p.action === 'fill') el.value = p.value;
      if (p.action === 'setChecked') el.checked = p.value;
      return true;
    });
    expect((await fill({ target: 'Full Name', value: 'Abebe Bikila' })).ok).toBe(true);
    expect((await setChecked({ target: 'I agree', checked: true })).ok).toBe(true);
    expect(page.calls).toEqual([
      { id: 'name-1', action: 'fill', value: 'Abebe Bikila' },
      { id: 'terms-1', action: 'setChecked', value: true },
    ]);
    expect((document.getElementById('t') as HTMLInputElement).checked).toBe(true);
    page.stop();
  });

  it('falls back to the DOM path when the component refuses', async () => {
    const page = respondAsPage(() => false);
    expect((await fill({ target: 'Full Name', value: 'Abebe Bikila' })).ok).toBe(true);
    expect((document.getElementById('n') as HTMLInputElement).value).toBe('Abebe Bikila');
    expect(page.calls).toHaveLength(1);
    page.stop();
    document.documentElement.removeAttribute('data-tederash-root');
  });
});

describe('fillForm (one round-trip for a whole form)', () => {
  beforeEach(() => {
    document.body.innerHTML = FORM;
  });

  it('fills text, choice and checkbox controls in one call', async () => {
    const res = await fillForm({
      entries: [
        { target: 'Full Legal Name', kind: 'text', value: 'Zenebech Tufa' },
        { target: 'Seniority', kind: 'choice', value: 'Senior' },
        { target: 'Work location', kind: 'choice', value: 'Remote' },
        { target: 'I agree to the terms', kind: 'checked', value: 'true' },
      ],
    });

    expect(res.ok).toBe(true);
    expect((document.getElementById('n') as HTMLInputElement).value).toBe('Zenebech Tufa');
    expect((document.getElementById('s') as HTMLSelectElement).value).toBe('sr');
    expect(document.querySelector<HTMLInputElement>('input[value="r"]')!.checked).toBe(true);
    expect((document.getElementById('t') as HTMLInputElement).checked).toBe(true);
    if (res.ok) {
      expect(res.outcome?.ok).toBe(true);
      expect((res.data as { filled: number; failed: number }).filled).toBe(4);
      expect((res.data as { failed: number }).failed).toBe(0);
    }
  });

  it('unchecks a checkbox when asked for "false"', async () => {
    (document.getElementById('t') as HTMLInputElement).checked = true;
    await fillForm({ entries: [{ target: 'I agree to the terms', kind: 'checked', value: 'false' }] });
    expect((document.getElementById('t') as HTMLInputElement).checked).toBe(false);
  });

  it('keeps going after a failure and reports which entries did not land', async () => {
    const res = await fillForm({
      entries: [
        { target: 'Full Legal Name', kind: 'text', value: 'Zenebech Tufa' },
        { target: 'Nonexistent Field', kind: 'text', value: 'nope' },
        { target: 'Seniority', kind: 'choice', value: 'Senior' },
      ],
    });

    expect(res.ok).toBe(true);
    // The two valid entries still ran.
    expect((document.getElementById('n') as HTMLInputElement).value).toBe('Zenebech Tufa');
    expect((document.getElementById('s') as HTMLSelectElement).value).toBe('sr');
    if (res.ok) {
      const data = res.data as { filled: number; failed: number; results: Array<{ target: string; ok: boolean; code?: string }> };
      expect(data.filled).toBe(2);
      expect(data.failed).toBe(1);
      expect(data.results.find((r) => r.target === 'Nonexistent Field')).toMatchObject({
        ok: false,
        code: 'NOT_FOUND',
      });
      // outcome.ok is false so the model knows the batch was only partly applied.
      expect(res.outcome?.ok).toBe(false);
      expect(res.outcome?.message).toContain('Not filled');
    }
  });

  it('refuses a password entry but still fills the rest', async () => {
    const res = await fillForm({
      entries: [
        { target: 'Password', kind: 'text', value: 'secret' },
        { target: 'Full Legal Name', kind: 'text', value: 'Zenebech Tufa' },
      ],
    });

    expect((document.getElementById('p') as HTMLInputElement).value).toBe('');
    expect((document.getElementById('n') as HTMLInputElement).value).toBe('Zenebech Tufa');
    if (res.ok) {
      const data = res.data as { results: Array<{ target: string; code?: string }> };
      expect(data.results.find((r) => r.target === 'Password')?.code).toBe('POLICY_BLOCKED');
    }
  });
});
