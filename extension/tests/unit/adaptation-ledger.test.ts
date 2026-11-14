import { beforeEach, describe, expect, it } from 'vitest';
import { AdaptationEngine } from '../../src/extension/content/adapt/engine';
import { BUILTIN_DEFAULTS } from '../../src/shared/settings/defaults';
import { resolveSettings } from '../../src/shared/settings/resolve';

describe('AdaptationEngine reversibility', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<main><p>Hello world</p></main>';
    for (const attr of Array.from(document.documentElement.attributes)) {
      document.documentElement.removeAttribute(attr.name);
    }
  });

  it('applies adaptations and reverts cleanly without leftover DOM mutations', () => {
    document.documentElement.setAttribute('data-tederash-theme', 'existing-host-attr');

    const engine = new AdaptationEngine();
    const effective = resolveSettings({
      profilePatch: {
        adaptation: {
          textScale: 1.4,
          contrastTheme: 'high-contrast',
          largeTargets: true,
          reduceMotion: true,
        },
      },
    });

    engine.apply(effective);

    const styleEl = document.getElementById('tederash-style');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('--tederash-scale: 1.4');
    expect(document.documentElement.getAttribute('data-tederash-active')).toBe('true');
    expect(document.documentElement.getAttribute('data-tederash-theme')).toBe('high-contrast');

    engine.revert();

    expect(document.getElementById('tederash-style')).toBeNull();
    expect(document.documentElement.getAttribute('data-tederash-active')).toBeNull();
    expect(document.documentElement.getAttribute('data-tederash-theme')).toBe('existing-host-attr');
  });

  it('reverts automatically when disabledOnSite is true', () => {
    const engine = new AdaptationEngine();
    engine.apply(BUILTIN_DEFAULTS);
    expect(document.getElementById('tederash-style')).not.toBeNull();

    engine.apply({ ...BUILTIN_DEFAULTS, disabledOnSite: true });
    expect(document.getElementById('tederash-style')).toBeNull();
  });
});
