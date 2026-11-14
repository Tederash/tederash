import type { BgToContentMessage, BgToOffscreenMessage } from './messages';

/**
 * Lightweight, dependency-free validator for BgToContent envelopes, used by the
 * content script so that zod (~450 KB bundled) is NOT injected into every web page.
 *
 * Invariant (enforced by tests/unit/messages-lite.test.ts): this parser must
 * handle every literal type in BG_TO_CONTENT_TYPES and must fail closed on
 * anything unexpected. The zod schema in messages.ts remains the source of
 * truth for the service worker and UI.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export type LiteParseResult<T> = { success: true; data: T } | { success: false };

const ADAPTATION_NUMBERS = [
  'textScale',
  'lineHeight',
  'letterSpacingEm',
  'wordSpacingEm',
  'paragraphSpacingEm',
] as const;

const ADAPTATION_BOOLEANS = [
  'enabled',
  'reflowSafe',
  'largeTargets',
  'focusHighlight',
  'readingRuler',
  'paragraphFocus',
  'reduceMotion',
  'hideDistractions',
  'fixMissingLabels',
] as const;

const CONTRAST_THEMES = new Set(['default', 'light', 'dark', 'high-contrast']);
const FONT_FAMILIES = new Set(['site', 'sans', 'dyslexic']);

/**
 * Lightweight parser for BgToOffscreen envelopes used by the offscreen
 * document (same rationale as parseBgToContent: no zod in tiny contexts).
 */
export function parseBgToOffscreen(raw: unknown): LiteParseResult<BgToOffscreenMessage> {
  if (!isRecord(raw)) return { success: false };
  if (raw.v !== 1) return { success: false };
  if (typeof raw.id !== 'string' || raw.id.length === 0) return { success: false };
  if (!isFiniteNumber(raw.ts)) return { success: false };
  if (!isRecord(raw.payload)) return { success: false };

  switch (raw.type) {
    case 'offscreen/stop':
      return { success: true, data: raw as BgToOffscreenMessage };

    case 'offscreen/speak': {
      const payload = raw.payload;
      if (typeof payload.text !== 'string' || payload.text.length < 1) {
        return { success: false };
      }
      if (payload.text.length > 8000) return { success: false };
      if (payload.rate !== undefined && !isFiniteNumber(payload.rate)) return { success: false };
      if (payload.pitch !== undefined && !isFiniteNumber(payload.pitch)) return { success: false };
      if (payload.lang !== undefined && typeof payload.lang !== 'string') {
        return { success: false };
      }
      return { success: true, data: raw as BgToOffscreenMessage };
    }

    default:
      return { success: false };
  }
}

function validateAdaptationSettings(adaptation: Record<string, unknown>): boolean {
  for (const key of ADAPTATION_NUMBERS) {
    if (!isFiniteNumber(adaptation[key])) return false;
  }
  for (const key of ADAPTATION_BOOLEANS) {
    if (typeof adaptation[key] !== 'boolean') return false;
  }
  if (
    typeof adaptation.contrastTheme !== 'string' ||
    !CONTRAST_THEMES.has(adaptation.contrastTheme)
  ) {
    return false;
  }
  if (typeof adaptation.fontFamily !== 'string' || !FONT_FAMILIES.has(adaptation.fontFamily)) {
    return false;
  }
  return true;
}

export function parseBgToContent(raw: unknown): LiteParseResult<BgToContentMessage> {
  if (!isRecord(raw)) return { success: false };
  if (raw.v !== 1) return { success: false };
  if (typeof raw.id !== 'string' || raw.id.length === 0) return { success: false };
  if (!isFiniteNumber(raw.ts)) return { success: false };
  if (!isRecord(raw.payload)) return { success: false };

  switch (raw.type) {
    case 'content/ping':
    case 'adapt/revert':
    case 'reading/extract':
      return { success: true, data: raw as BgToContentMessage };

    case 'adapt/apply': {
      const effective = raw.payload.effective;
      if (!isRecord(effective)) return { success: false };
      if (typeof effective.disabledOnSite !== 'boolean') return { success: false };
      if (!isRecord(effective.adaptation)) return { success: false };
      if (!validateAdaptationSettings(effective.adaptation)) return { success: false };
      return { success: true, data: raw as BgToContentMessage };
    }

    default:
      return { success: false };
  }
}
