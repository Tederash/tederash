import { BUILTIN_DEFAULTS } from '../../shared/settings/defaults';
import type { ToolCall, ToolResult } from '../../shared/tools';
import { adaptationEngine } from './adapt/engine';
import { buildPageSnapshot, getElementByRef } from './snapshot';

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.name) {
      case 'observe_page': {
        const snapshot = buildPageSnapshot(call.args);
        return {
          ok: true,
          data: snapshot,
          outcome: {
            ok: true,
            message: `Observed page with ${snapshot.elements.length} elements and ${snapshot.headings.length} headings.`,
          },
        };
      }

      case 'find_elements': {
        const query = call.args.query.toLowerCase();
        const roleFilter = call.args.role?.toLowerCase();
        const snapshot = buildPageSnapshot();

        const matches = snapshot.elements.filter((el) => {
          if (roleFilter && el.role?.toLowerCase() !== roleFilter && el.tag !== roleFilter) {
            return false;
          }
          const nameMatch = el.name?.toLowerCase().includes(query);
          const valMatch = el.value?.toLowerCase().includes(query);
          const phMatch = el.placeholder?.toLowerCase().includes(query);
          return Boolean(nameMatch || valMatch || phMatch);
        });

        return {
          ok: true,
          data: matches,
          outcome: {
            ok: true,
            message: `Found ${matches.length} matching elements for "${call.args.query}".`,
          },
        };
      }

      case 'click': {
        const el = getElementByRef(call.args.ref);
        if (!el) {
          return {
            ok: false,
            error: {
              code: 'NOT_FOUND',
              message: `Element ref "${call.args.ref}" not found in current snapshot. Call observe_page to refresh refs.`,
            },
          };
        }

        // Scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus if focusable
        if (el instanceof HTMLElement) {
          el.focus();
        }

        // Synthetic mouse event sequence
        const mouseEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (const evtName of mouseEvents) {
          const event = new MouseEvent(evtName, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1,
          });
          el.dispatchEvent(event);
        }

        // Direct click fallback
        if (el instanceof HTMLElement) {
          el.click();
        }

        return {
          ok: true,
          outcome: {
            ok: true,
            domChanged: true,
            message: `Clicked element [${call.args.ref}] <${el.tagName.toLowerCase()}>.`,
          },
        };
      }

      case 'fill_field': {
        const el = getElementByRef(call.args.ref);
        if (!el) {
          return {
            ok: false,
            error: {
              code: 'NOT_FOUND',
              message: `Element ref "${call.args.ref}" not found.`,
            },
          };
        }

        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          return {
            ok: false,
            error: {
              code: 'NOT_A_FIELD',
              message: `Element [${call.args.ref}] is <${el.tagName.toLowerCase()}> and cannot accept text input.`,
            },
          };
        }

        el.focus();

        // Native property descriptor setter so React/Vue controlled state synchronizes properly
        const prototype =
          el instanceof HTMLInputElement
            ? window.HTMLInputElement.prototype
            : window.HTMLTextAreaElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(el, call.args.value);
        } else {
          el.value = call.args.value;
        }

        // Dispatch input and change events
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        return {
          ok: true,
          outcome: {
            ok: true,
            domChanged: true,
            message: `Filled value into [${call.args.ref}].`,
          },
        };
      }

      case 'scroll': {
        const { direction, amount, ref } = call.args;
        if (ref) {
          const el = getElementByRef(ref);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return {
              ok: true,
              outcome: { ok: true, message: `Scrolled element [${ref}] into view.` },
            };
          }
        }

        let deltaY = window.innerHeight * 0.5;
        if (amount === 'small') deltaY = 200;
        if (amount === 'page') deltaY = window.innerHeight * 0.85;

        if (direction === 'up') deltaY = -deltaY;
        if (direction === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return { ok: true, outcome: { ok: true, message: 'Scrolled to top of page.' } };
        }
        if (direction === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          return { ok: true, outcome: { ok: true, message: 'Scrolled to bottom of page.' } };
        }

        window.scrollBy({ top: deltaY, behavior: 'smooth' });
        return {
          ok: true,
          outcome: {
            ok: true,
            message: `Scrolled ${direction} by ${Math.abs(deltaY)}px.`,
          },
        };
      }

      case 'read_text': {
        let text = '';
        if (call.args.ref) {
          const el = getElementByRef(call.args.ref);
          text = el?.textContent || '';
        } else {
          const target =
            document.querySelector('main, article, [role="main"]') || document.body;
          text = target?.textContent || '';
        }
        const clean = text.replace(/\s+/g, ' ').trim();
        const max = call.args.maxChars || 3000;
        return {
          ok: true,
          data: clean.slice(0, max),
          outcome: {
            ok: true,
            message: `Extracted ${Math.min(clean.length, max)} characters of readable text.`,
          },
        };
      }

      case 'set_adaptation': {
        // Apply adaptations via AdaptationEngine
        const patch: Record<string, unknown> = {};
        if (call.args.textScale !== undefined) patch.textScale = call.args.textScale;
        if (call.args.contrastTheme !== undefined) patch.contrastTheme = call.args.contrastTheme;
        if (call.args.largeTargets !== undefined) patch.largeTargets = call.args.largeTargets;
        if (call.args.focusHighlight !== undefined) patch.focusHighlight = call.args.focusHighlight;
        if (call.args.readingRuler !== undefined) patch.readingRuler = call.args.readingRuler;
        if (call.args.reduceMotion !== undefined) patch.reduceMotion = call.args.reduceMotion;

        adaptationEngine.apply({
          ...BUILTIN_DEFAULTS,
          adaptation: {
            ...BUILTIN_DEFAULTS.adaptation,
            ...patch,
          },
        });

        return {
          ok: true,
          outcome: {
            ok: true,
            domChanged: true,
            message: `Applied adaptation settings: ${JSON.stringify(patch)}`,
          },
        };
      }

      case 'say': {
        return {
          ok: true,
          outcome: { ok: true, message: call.args.text },
        };
      }

      case 'finish': {
        return {
          ok: true,
          outcome: { ok: true, message: call.args.summary },
        };
      }

      default:
        return {
          ok: false,
          error: {
            code: 'UNKNOWN_TOOL',
            message: `Tool action is not recognized.`,
          },
        };
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
