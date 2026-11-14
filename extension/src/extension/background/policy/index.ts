import type { ToolCall, ToolRisk } from '../../../shared/tools';

const CONSEQUENTIAL_KEYWORDS = [
  'submit',
  'pay',
  'purchase',
  'place order',
  'send',
  'confirm',
  'buy',
  'checkout',
];

const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'cancel account',
  'destroy',
  'erase',
  'wipe',
  'clear all',
];

export interface PolicyEvaluation {
  risk: ToolRisk;
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

export function evaluatePolicy(call: ToolCall, elementContext?: { text?: string; role?: string }): PolicyEvaluation {
  switch (call.name) {
    case 'observe_page':
    case 'find_elements':
    case 'scroll':
    case 'read_text':
    case 'set_adaptation':
    case 'say':
    case 'finish':
      return {
        risk: 'none',
        allowed: true,
        requiresConfirmation: false,
      };

    case 'page_state':
    case 'find':
      return { risk: 'none', allowed: true, requiresConfirmation: false };

    case 'fill':
    case 'choose':
    case 'set_checked':
    case 'fill_field':
      return {
        risk: 'low',
        allowed: true,
        requiresConfirmation: false,
      };

    case 'click': {
      const text = (elementContext?.text || '').toLowerCase();
      for (const word of DESTRUCTIVE_KEYWORDS) {
        if (text.includes(word)) {
          return {
            risk: 'destructive',
            allowed: true,
            requiresConfirmation: true,
            reason: `Action "${word}" appears destructive. User confirmation is strictly required.`,
          };
        }
      }
      for (const word of CONSEQUENTIAL_KEYWORDS) {
        if (text.includes(word)) {
          return {
            risk: 'consequential',
            allowed: true,
            requiresConfirmation: true,
            reason: `Action "${word}" is consequential. User confirmation is required.`,
          };
        }
      }
      return {
        risk: 'low',
        allowed: true,
        requiresConfirmation: false,
      };
    }

    default:
      return {
        risk: 'none',
        allowed: true,
        requiresConfirmation: false,
      };
  }
}
