import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '../../src/extension/background/policy';

describe('Policy Engine', () => {
  it('classifies read and observation tools as risk: none', () => {
    const res = evaluatePolicy({ name: 'observe_page', args: {} });
    expect(res.risk).toBe('none');
    expect(res.allowed).toBe(true);
    expect(res.requiresConfirmation).toBe(false);
  });

  it('classifies normal clicks as risk: low', () => {
    const res = evaluatePolicy({ name: 'click', args: { ref: 'e1' } }, { text: 'Read more' });
    expect(res.risk).toBe('low');
    expect(res.allowed).toBe(true);
    expect(res.requiresConfirmation).toBe(false);
  });

  it('flags consequential clicks for confirmation', () => {
    const res = evaluatePolicy({ name: 'click', args: { ref: 'e2' } }, { text: 'Place Order ($49)' });
    expect(res.risk).toBe('consequential');
    expect(res.requiresConfirmation).toBe(true);
  });

  it('flags destructive actions for strict confirmation', () => {
    const res = evaluatePolicy({ name: 'click', args: { ref: 'e3' } }, { text: 'Delete my account' });
    expect(res.risk).toBe('destructive');
    expect(res.requiresConfirmation).toBe(true);
  });
});
