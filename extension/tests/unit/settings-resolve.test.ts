import { describe, expect, it } from 'vitest';
import { BUILTIN_DEFAULTS, createInitialPersistedState } from '../../src/shared/settings/defaults';
import { migratePersistedState } from '../../src/shared/settings/migrations';
import { resolveSettings } from '../../src/shared/settings/resolve';

describe('resolveSettings precedence', () => {
  it('returns built-in defaults when no patches are provided', () => {
    const resolved = resolveSettings({});
    expect(resolved).toEqual(BUILTIN_DEFAULTS);
  });

  it('applies 5-tier precedence: defaults -> global -> profile -> site -> session', () => {
    const resolved = resolveSettings({
      globalPatch: { adaptation: { textScale: 1.1, contrastTheme: 'dark' } },
      profilePatch: { adaptation: { textScale: 1.3, readingRuler: true } },
      sitePatch: { adaptation: { textScale: 1.5, largeTargets: true } },
      sessionPatch: { adaptation: { textScale: 1.8 } },
    });

    expect(resolved.adaptation.textScale).toBe(1.8);
    expect(resolved.adaptation.largeTargets).toBe(true);
    expect(resolved.adaptation.readingRuler).toBe(true);
    expect(resolved.adaptation.contrastTheme).toBe('dark');
  });

  it('allows site override to disable the extension on a specific site', () => {
    const resolved = resolveSettings({
      profilePatch: { adaptation: { textScale: 1.4 } },
      sitePatch: { disabledOnSite: true },
    });

    expect(resolved.disabledOnSite).toBe(true);
    expect(resolved.adaptation.textScale).toBe(1.4);
  });

  it('ignores undefined fields inside partial patches', () => {
    const resolved = resolveSettings({
      globalPatch: { adaptation: { textScale: 1.2 } },
      sitePatch: { adaptation: { textScale: undefined } },
    });

    expect(resolved.adaptation.textScale).toBe(1.2);
  });
});

describe('migratePersistedState', () => {
  it('returns valid initial state for null/corrupt storage', () => {
    const fallback = migratePersistedState(null);
    expect(fallback.schemaVersion).toBe(1);
    expect(fallback.profiles.length).toBeGreaterThanOrEqual(5);

    const corrupt = migratePersistedState({ schemaVersion: 999, bogus: true });
    expect(corrupt).toEqual(createInitialPersistedState());
  });

  it('preserves valid v1 persisted state', () => {
    const state = createInitialPersistedState();
    state.activeProfileId = 'low-vision';
    state.onboardingCompleted = true;

    const migrated = migratePersistedState(state);
    expect(migrated.activeProfileId).toBe('low-vision');
    expect(migrated.onboardingCompleted).toBe(true);
  });
});
