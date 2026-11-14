import { describe, expect, it } from 'vitest';
import {
  BgToContentSchema,
  ContentToBgSchema,
  UiToBgSchema,
  createEnvelope,
} from '../../src/shared/messages';

describe('message envelope validation', () => {
  it('validates UiToBg envelopes created with createEnvelope', () => {
    const ping = createEnvelope('system/ping', {});
    expect(UiToBgSchema.safeParse(ping).success).toBe(true);

    const update = createEnvelope('settings/update', {
      scope: 'site',
      origin: 'https://example.com',
      patch: { adaptation: { textScale: 1.4 } },
    });
    expect(UiToBgSchema.safeParse(update).success).toBe(true);
  });

  it('rejects out-of-range settings or unknown message types', () => {
    const badScale = createEnvelope('settings/update', {
      scope: 'global',
      patch: { adaptation: { textScale: 99 } },
    });
    expect(UiToBgSchema.safeParse(badScale).success).toBe(false);

    const unknownType = { v: 1, id: '1', type: 'evil/eval', payload: {}, ts: Date.now() };
    expect(UiToBgSchema.safeParse(unknownType).success).toBe(false);
    expect(BgToContentSchema.safeParse(unknownType).success).toBe(false);
    expect(ContentToBgSchema.safeParse(unknownType).success).toBe(false);
  });
});
