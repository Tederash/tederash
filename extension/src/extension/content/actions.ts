import { BUILTIN_DEFAULTS } from '../../shared/settings/defaults';
import type { ToolCall, ToolResult } from '../../shared/tools';
import { adaptationEngine } from './adapt/engine';
import { buildPageSnapshot, getElementByRef } from './snapshot';
import {
  detectTederashInPage,
  queryTederashTree,
  sendBridgeRequest,
} from './tederash-bridge';

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

      case 'tederash_detect': {
        const info = detectTederashInPage();
        return {
          ok: true,
          data: info,
          outcome: {
            ok: true,
            message: info.isTederash
              ? `Tederash active (v${info.version || '0.1.0'}, profile: ${info.profile || 'standard'}).`
              : 'Tederash runtime not detected on page.',
          },
        };
      }

      case 'tederash_get_tree': {
        const tree = queryTederashTree();
        return {
          ok: true,
          data: tree,
          outcome: {
            ok: true,
            message: `Found ${tree.length} Tederash accessible components on page.`,
          },
        };
      }

      case 'tederash_set_profile': {
        const res = await sendBridgeRequest('tederash:set_profile', {
          profile: { id: call.args.profileId },
        });
        if (!res.ok) {
          return {
            ok: false,
            error: {
              code: 'BRIDGE_ERROR',
              message: res.error || 'Failed to switch profile via Tederash bridge',
            },
          };
        }
        return {
          ok: true,
          data: res.data,
          outcome: {
            ok: true,
            message: `Switched accessibility profile to "${call.args.profileId}".`,
          },
        };
      }

      case 'tederash_update_pref': {
        const patch: Record<string, any> = {};
        if (
          call.args.fontScale !== undefined ||
          call.args.highContrast !== undefined ||
          call.args.reduceMotion !== undefined
        ) {
          patch.visual = {};
          if (call.args.fontScale !== undefined) patch.visual.fontScale = call.args.fontScale;
          if (call.args.highContrast !== undefined) patch.visual.highContrast = call.args.highContrast;
          if (call.args.reduceMotion !== undefined) patch.visual.reduceMotion = call.args.reduceMotion;
        }
        if (call.args.targetSize !== undefined) {
          patch.motor = { targetSize: call.args.targetSize };
        }
        if (
          call.args.simplifiedLanguage !== undefined ||
          call.args.showInstructions !== undefined
        ) {
          patch.cognitive = {};
          if (call.args.simplifiedLanguage !== undefined)
            patch.cognitive.simplifiedLanguage = call.args.simplifiedLanguage;
          if (call.args.showInstructions !== undefined)
            patch.cognitive.showInstructions = call.args.showInstructions;
        }

        const res = await sendBridgeRequest('tederash:update_pref', { patch });
        if (!res.ok) {
          return {
            ok: false,
            error: {
              code: 'BRIDGE_ERROR',
              message: res.error || 'Failed to update preferences via Tederash bridge',
            },
          };
        }
        return {
          ok: true,
          data: res.data,
          outcome: { ok: true, message: 'Updated Tederash preferences.' },
        };
      }

      case 'tederash_announce': {
        const res = await sendBridgeRequest('tederash:announce', {
          message: call.args.message,
          priority: call.args.priority || 'polite',
        });
        return {
          ok: true,
          data: res.data,
          outcome: {
            ok: true,
            message: `Announced: "${call.args.message}" (${call.args.priority || 'polite'}).`,
          },
        };
      }

      case 'tederash_interact': {
        const selector = `[data-tederash-id="${call.args.componentId}"], #${call.args.componentId}`;
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) {
          return {
            ok: false,
            error: {
              code: 'NOT_FOUND',
              message: `Tederash component "${call.args.componentId}" not found on page.`,
            },
          };
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        switch (call.args.action) {
          case 'click':
          case 'toggle':
            el.click();
            break;
          case 'focus':
            el.focus();
            break;
          case 'fill': {
            const input = el as HTMLInputElement | HTMLTextAreaElement;
            input.focus();
            input.value = call.args.value ?? '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
          case 'select': {
            el.click(); // Open select dropdown
            break;
          }
        }

        return {
          ok: true,
          outcome: {
            ok: true,
            message: `Performed "${call.args.action}" on Tederash component [${call.args.componentId}].`,
          },
        };
      }

      case 'tederash_explain_field': {
        const selector = `[data-tederash-id="${call.args.componentId}"], #${call.args.componentId}`;
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) {
          return {
            ok: false,
            error: {
              code: 'NOT_FOUND',
              message: `Field "${call.args.componentId}" not found.`,
            },
          };
        }

        const label =
          el.getAttribute('data-tederash-label') ||
          el.getAttribute('aria-label') ||
          document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim();
        const descId = el.getAttribute('aria-describedby');
        const descText = descId
          ? document.getElementById(descId)?.textContent?.trim()
          : undefined;
        const errorText =
          el.getAttribute('data-tederash-error') ||
          document.getElementById(`${el.id}-error`)?.textContent?.trim();
        const isRequired =
          el.getAttribute('data-tederash-required') === 'true' ||
          el.getAttribute('aria-required') === 'true';
        const val = (el as HTMLInputElement).value;

        return {
          ok: true,
          data: {
            id: call.args.componentId,
            label,
            description: descText,
            required: isRequired,
            error: errorText,
            currentValue: val,
          },
          outcome: {
            ok: true,
            message: `Retrieved field metadata for [${call.args.componentId}].`,
          },
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
