import type { EffectiveSettings } from '../../../shared/settings/schema';
import { MutationLedger } from './ledger';

const STYLE_ID = 'tederash-style';
const RULER_ID = 'tederash-ruler';

const SPACING_DEFAULTS = { lineHeight: 1.5, letterSpacingEm: 0, wordSpacingEm: 0, paragraphSpacingEm: 1.0 } as const;

const FONT_STACKS: Record<Exclude<EffectiveSettings['adaptation']['fontFamily'], 'site'>, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  dyslexic:
    "'OpenDyslexic', 'Comic Sans MS', Verdana, Tahoma, 'Atkinson Hyperlegible', sans-serif",
};

const TEXT_ELEMENTS = 'p, li, dd, dt, blockquote, h1, h2, h3, h4, h5, h6, pre, figcaption, td, th';

export class AdaptationEngine {
  private ledger = new MutationLedger();
  private rulerEl: HTMLDivElement | null = null;
  private rulerHandler: ((event: MouseEvent) => void) | null = null;

  apply(effective: EffectiveSettings): void {
    if (effective.disabledOnSite || !effective.adaptation.enabled) {
      this.revert();
      return;
    }

    const root = document.documentElement;
    const { adaptation } = effective;

    const setTrackedAttr = (name: string, value: string | null) => {
      this.ledger.recordAttr(root, name);
      if (value === null) {
        root.removeAttribute(name);
      } else {
        root.setAttribute(name, value);
      }
    };

    setTrackedAttr('data-tederash-active', 'true');
    setTrackedAttr('data-tederash-theme', adaptation.contrastTheme);
    setTrackedAttr('data-tederash-focus', adaptation.focusHighlight ? 'true' : null);
    setTrackedAttr('data-tederash-targets', adaptation.largeTargets ? 'true' : null);
    setTrackedAttr('data-tederash-motion', adaptation.reduceMotion ? 'reduce' : null);

    const spacingActive =
      adaptation.lineHeight !== SPACING_DEFAULTS.lineHeight ||
      adaptation.letterSpacingEm !== SPACING_DEFAULTS.letterSpacingEm ||
      adaptation.wordSpacingEm !== SPACING_DEFAULTS.wordSpacingEm ||
      adaptation.paragraphSpacingEm !== SPACING_DEFAULTS.paragraphSpacingEm;
    setTrackedAttr('data-tederash-spacing', spacingActive ? 'true' : null);

    const fontActive = adaptation.fontFamily !== 'site';
    setTrackedAttr('data-tederash-font', fontActive ? adaptation.fontFamily : null);    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      (document.head ?? root).appendChild(styleEl);
    }

    const cssLines: string[] = [
      `html[data-tederash-active="true"] { --tederash-scale: ${adaptation.textScale}; font-size: calc(100% * var(--tederash-scale)) !important; }`,
    ];

    if (adaptation.focusHighlight) {
      cssLines.push(
        `html[data-tederash-focus="true"] :focus-visible { outline: 3px solid #2563eb !important; outline-offset: 2px !important; }`
      );
    }

    if (adaptation.largeTargets) {
      cssLines.push(
        `html[data-tederash-targets="true"] :where(a, button, [role="button"], input, select) { min-width: 44px; min-height: 44px; }`
      );
    }

    if (adaptation.reduceMotion) {
      cssLines.push(
        `html[data-tederash-motion="reduce"] *, html[data-tederash-motion="reduce"] *::before, html[data-tederash-motion="reduce"] *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }`
      );
    }

    if (spacingActive) {
      cssLines.push(
        `html[data-tederash-spacing="true"] :where(${TEXT_ELEMENTS}) { line-height: ${adaptation.lineHeight} !important; letter-spacing: ${adaptation.letterSpacingEm}em !important; word-spacing: ${adaptation.wordSpacingEm}em !important; }`
      );
      if (adaptation.paragraphSpacingEm !== SPACING_DEFAULTS.paragraphSpacingEm) {
        cssLines.push(
          `html[data-tederash-spacing="true"] :where(p) { margin-bottom: ${adaptation.paragraphSpacingEm}em !important; }`
        );
      }
    }

    if (adaptation.fontFamily !== 'site') {
      cssLines.push(
        `html[data-tederash-font="${adaptation.fontFamily}"] body { font-family: ${FONT_STACKS[adaptation.fontFamily]} !important; }`
      );
    }

    if (adaptation.contrastTheme === 'high-contrast') {
      cssLines.push(
        `html[data-tederash-theme="high-contrast"], html[data-tederash-theme="high-contrast"] body { background-color: #000000 !important; color: #ffffff !important; }`,
        `html[data-tederash-theme="high-contrast"] a { color: #ffff00 !important; text-decoration: underline !important; }`
      );
    } else if (adaptation.contrastTheme === 'dark') {
      cssLines.push(
        `html[data-tederash-theme="dark"] { filter: invert(1) hue-rotate(180deg); }`,
        `html[data-tederash-theme="dark"] :where(img, video, picture, canvas, svg) { filter: invert(1) hue-rotate(180deg); }`
      );
    }

    styleEl.textContent = cssLines.join('\n');

    this.updateRuler(adaptation.readingRuler);
  }

  revert(): void {
    const styleEl = document.getElementById(STYLE_ID);
    if (styleEl) {
      styleEl.remove();
    }
    this.updateRuler(false);
    this.ledger.revert();
  }

  /** Reading ruler: a translucent band that follows the pointer, in our own overlay element. */
  private updateRuler(enabled: boolean): void {
    if (enabled) {
      if (!this.rulerEl) {
        const el = document.createElement('div');
        el.id = RULER_ID;
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute(
          'style',
          [
            'position: fixed',
            'left: 0',
            'right: 0',
            'top: 0',
            'height: 84px',
            'pointer-events: none',
            'z-index: 2147483646',
            'background: linear-gradient(to bottom, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.05) 60%, transparent)',
            'border-bottom: 2px solid rgba(37, 99, 235, 0.55)',
            'box-shadow: 0 2px 10px rgba(15, 23, 42, 0.25)',
            'will-change: transform',
          ].join('; ')
        );
        (document.body ?? document.documentElement).appendChild(el);
        this.rulerEl = el;

        this.rulerHandler = (event: MouseEvent) => {
          if (this.rulerEl) {
            this.rulerEl.style.transform = `translateY(${event.clientY - 42}px)`;
          }
        };
        window.addEventListener('mousemove', this.rulerHandler, { passive: true });
      }
    } else if (this.rulerEl) {
      if (this.rulerHandler) {
        window.removeEventListener('mousemove', this.rulerHandler);
        this.rulerHandler = null;
      }
      this.rulerEl.remove();
      this.rulerEl = null;
    }
  }
}

export const adaptationEngine = new AdaptationEngine();
