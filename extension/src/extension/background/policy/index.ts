import type { ToolCall, ToolRisk } from '../../../shared/tools';

/** English and Amharic words that make a click consequential (it sends or commits something). */
const CONSEQUENTIAL_KEYWORDS = [
  'submit',
  'pay',
  'purchase',
  'place order',
  'send',
  'confirm',
  'buy',
  'checkout',
  'apply',
  'sign up',
  'register',
  'book',
  'transfer',
  'አስገባ',
  'ላክ',
  'ክፈል',
  'ግዛ',
  'አረጋግጥ',
  'ተመዝገብ',
];

/** Words that make a click destructive (removes or cancels something). */
const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'cancel account',
  'cancel application',
  'destroy',
  'erase',
  'wipe',
  'clear all',
  'reset',
  'withdraw',
  'ሰርዝ',
  'አጥፋ',
];

export interface PolicyEvaluation {
  risk: ToolRisk;
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

/** What the content script reports about a click target before acting. */
export interface ElementContext {
  text?: string;
  role?: string;
  /** Submits a form (type=submit inside a form). */
  submit?: boolean;
  kind?: string;
}

const SAFE: PolicyEvaluation = { risk: 'none', allowed: true, requiresConfirmation: false };
const LOW: PolicyEvaluation = { risk: 'low', allowed: true, requiresConfirmation: false };

function includesWord(text: string, word: string): boolean {
  // Latin words match on word boundaries ("send" not in "sender"); Ge'ez words by substring.
  return /^[a-z ]+$/.test(word) ? new RegExp(`\\b${word}\\b`).test(text) : text.includes(word);
}

export function evaluatePolicy(call: ToolCall, elementContext?: ElementContext): PolicyEvaluation {
  switch (call.name) {
    case 'observe_page':
    case 'find_elements':
    case 'scroll':
    case 'read_text':
    case 'set_adaptation':
    case 'say':
    case 'finish':
    case 'page_state':
    case 'find':
    case 'inspect_form':
    case 'inspect_page':
      return SAFE;

    case 'fill':
    case 'choose':
    case 'set_checked':
    case 'fill_field':
      return LOW;

    case 'click': {
      const text = (elementContext?.text || '').toLowerCase();
      for (const word of DESTRUCTIVE_KEYWORDS) {
        if (includesWord(text, word)) {
          return {
            risk: 'destructive',
            allowed: true,
            requiresConfirmation: true,
            reason: `"${elementContext?.text}" looks like it deletes or cancels something.`,
          };
        }
      }
      if (elementContext?.submit) {
        return {
          risk: 'consequential',
          allowed: true,
          requiresConfirmation: true,
          reason: `"${elementContext.text}" submits the form.`,
        };
      }
      for (const word of CONSEQUENTIAL_KEYWORDS) {
        if (includesWord(text, word)) {
          return {
            risk: 'consequential',
            allowed: true,
            requiresConfirmation: true,
            reason: `"${elementContext?.text}" sends or commits something.`,
          };
        }
      }
      return LOW;
    }

    default:
      return SAFE;
  }
}
