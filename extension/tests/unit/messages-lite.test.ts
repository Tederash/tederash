import { describe, expect, it } from 'vitest';
import {
  BgToContentSchema,
  BgToOffscreenSchema,
  BG_TO_CONTENT_TYPES,
  BG_TO_OFFSCREEN_TYPES,
  createEnvelope,
} from '../../src/shared/messages';
import { parseBgToContent, parseBgToOffscreen } from '../../src/shared/messages-lite';
import { BUILTIN_DEFAULTS } from '../../src/shared/settings/defaults';

function validApplyEnvelope() {
  return createEnvelope('adapt/apply', { effective: BUILTIN_DEFAULTS });
}

describe('parseBgToContent (lite content-script parser)', () => {
  it('covers every literal type in BG_TO_CONTENT_TYPES', () => {
    const handled = new Set<string>();
    // Probe each type with an empty-payload envelope; adapt/apply needs a valid payload.
    for (const type of BG_TO_CONTENT_TYPES) {
      const raw =
        type === 'adapt/apply'
          ? validApplyEnvelope()
          : createEnvelope(type, {});
      const result = parseBgToContent(raw);
      if (result.success) handled.add(type);
    }
    expect([...handled].sort()).toEqual([...BG_TO_CONTENT_TYPES].sort());
  });

  it('agrees with the zod schema on valid envelopes', () => {
    for (const raw of [
      createEnvelope('content/ping', {}),
      createEnvelope('adapt/revert', {}),
      createEnvelope('reading/extract', {}),
      validApplyEnvelope(),
    ]) {
      const zod = BgToContentSchema.safeParse(raw);
      const lite = parseBgToContent(raw);
      expect(zod.success).toBe(true);
      expect(lite.success).toBe(true);
    }
  });

  it('rejects malformed envelopes (fail closed)', () => {
    const bad = [
      null,
      'string',
      {}, // not an envelope
      { v: 2, id: 'x', type: 'content/ping', payload: {}, ts: 1 },
      { v: 1, id: '', type: 'content/ping', payload: {}, ts: 1 },
      { v: 1, id: 'x', type: 'evil/eval', payload: {}, ts: 1 },
      { v: 1, id: 'x', type: 'content/ping', payload: undefined, ts: 1 },
      createEnvelope('adapt/apply', { effective: { disabledOnSite: false } }), // no adaptation
    ];
    for (const raw of bad) {
      expect(parseBgToContent(raw).success).toBe(false);
    }
  });

  it('rejects adapt/apply with values that could inject CSS', () => {
    const bad = [
      { ...BUILTIN_DEFAULTS, adaptation: { ...BUILTIN_DEFAULTS.adaptation, textScale: '2"; } * { display:none }' } },
      { ...BUILTIN_DEFAULTS, adaptation: { ...BUILTIN_DEFAULTS.adaptation, textScale: Number.NaN } },
      { ...BUILTIN_DEFAULTS, adaptation: { ...BUILTIN_DEFAULTS.adaptation, contrastTheme: 'purple' } },
      { ...BUILTIN_DEFAULTS, adaptation: { ...BUILTIN_DEFAULTS.adaptation, fontFamily: 'not-a-font' } },
      { ...BUILTIN_DEFAULTS, adaptation: { ...BUILTIN_DEFAULTS.adaptation, readingRuler: 'yes' } },
    ];
    for (const effective of bad) {
      const raw = createEnvelope('adapt/apply', { effective });
      expect(parseBgToContent(raw).success).toBe(false);
    }
  });

  it('accepts well-formed effective settings', () => {
    const raw = createEnvelope('adapt/apply', { effective: BUILTIN_DEFAULTS });
    const result = parseBgToContent(raw);
    expect(result.success).toBe(true);
  });
});

describe('parseBgToOffscreen (lite offscreen parser)', () => {
  it('covers every literal type in BG_TO_OFFSCREEN_TYPES', () => {
    for (const type of BG_TO_OFFSCREEN_TYPES) {
      const raw =
        type === 'offscreen/speak'
          ? createEnvelope('offscreen/speak', { text: 'hello' })
          : createEnvelope('offscreen/stop', {});
      expect(parseBgToOffscreen(raw).success).toBe(true);
    }
  });

  it('agrees with the zod schema on valid speak envelopes', () => {
    const raw = createEnvelope('offscreen/speak', { text: 'hi', rate: 1.2, lang: 'en-US' });
    expect(BgToOffscreenSchema.safeParse(raw).success).toBe(true);
    expect(parseBgToOffscreen(raw).success).toBe(true);
  });

  it('rejects malformed speak envelopes', () => {
    const bad = [
      createEnvelope('offscreen/speak', { text: '' }),
      createEnvelope('offscreen/speak', { text: 'x'.repeat(8001) }),
      createEnvelope('offscreen/speak', { text: 'hi', rate: 'fast' }),
      createEnvelope('offscreen/speak', {}),
      createEnvelope('offscreen/evil', {}),
    ];
    for (const raw of bad) {
      expect(BgToOffscreenSchema.safeParse(raw).success).toBe(false);
      expect(parseBgToOffscreen(raw).success).toBe(false);
    }
  });
});
