import type { ModelMessage } from 'ai';
import type { PageField, PageState } from '../../../shared/tools';
import type { CallModel, ModelToolCall } from './loop';
import type { AgentToolName } from './tools';

/**
 * Deterministic intent router: the offline agent (no API key) and the last fallback
 * when every model fails. It understands common, unambiguous requests in English and
 * Amharic and uses the Page Model, so "insert X in the Full Name field" / "በሙሉ ስም
 * መስክ ውስጥ X አስገባ" works without any LLM. Targets are passed through as plain
 * words; the content-side resolver matches them against the page's own labels, so
 * Amharic requests resolve on pages whose labels are Amharic.
 */

export type RoutedIntent =
  | { kind: 'tool'; tool: AgentToolName; args: Record<string, unknown> }
  | { kind: 'answer'; text: string };

export type RouterLanguage = 'en' | 'am';

/** Ge'ez (Ethiopic) script: Amharic, Tigrinya and friends. */
const ETHIOPIC = /[ሀ-፿]/;
export const isAmharic = (text: string): boolean => ETHIOPIC.test(text);
export const routerLanguage = (text: string): RouterLanguage => (isAmharic(text) ? 'am' : 'en');

const QUOTES = /^["“'‘«„]+|["”'’»።፣፤፥.!?]+$/g;
const clean = (s: string) => s.trim().replace(QUOTES, '').trim();
const stripField = (s: string) => clean(s).replace(/^(the|my)\s+/i, '').replace(/\s+(field|box|input|dropdown|menu)$/i, '');

const CHOICE_KINDS = new Set(['select', 'combobox', 'radio']);

function fieldFor(state: PageState | undefined, words: string): PageField | undefined {
  if (!state) return undefined;
  const w = words.toLowerCase();
  return (
    state.fields.find((f) => f.label.toLowerCase() === w) ??
    state.fields.find((f) => f.label.toLowerCase().includes(w)) ??
    state.fields.find((f) => w.split(/\s+/).every((part) => f.label.toLowerCase().includes(part)))
  );
}

export function describeForm(state: PageState, lang: RouterLanguage = 'en'): string {
  const am = lang === 'am';
  if (!state.fields.length) {
    return am ? `በ“${state.title}” ላይ ምንም የቅጽ መስኮች አላገኘሁም።` : `I couldn't find any form fields on “${state.title}”.`;
  }
  const lines = state.fields.map((f) => {
    const bits = [f.required ? (am ? 'ግዴታ' : 'required') : am ? 'አማራጭ' : 'optional'];
    if (f.options?.length) bits.push(`${am ? 'አማራጮች' : 'options'}: ${f.options.join(', ')}`);
    if (f.sensitive) bits.push(am ? 'ይህን እርስዎ ራስዎ ይሙሉ' : 'you fill this one yourself');
    else if (f.value) bits.push(am ? `አሁን “${f.value}”` : `currently “${f.value}”`);
    if (f.error) bits.push(`${am ? 'ስህተት' : 'error'}: ${f.error}`);
    return `- **${f.label}** (${bits.join('; ')})`;
  });
  const required = state.fields.filter((f) => f.required).length;
  const intro = am
    ? `ይህ ቅጽ ${state.fields.length} መስኮች አሉት፣ ${required} ግዴታ፦`
    : `This form has ${state.fields.length} fields, ${required} required:`;
  return `${intro}\n\n${lines.join('\n')}`;
}

export function routeIntent(text: string, state?: PageState): RoutedIntent | undefined {
  const t = text.trim();
  return isAmharic(t) ? routeAmharic(t, state) : routeEnglish(t, state);
}

function routeEnglish(t: string, state?: PageState): RoutedIntent | undefined {
  let m: RegExpMatchArray | null;

  // "insert 'X' in the Full Name field", "type X into email", "put X in Y"
  if ((m = t.match(/^(?:please\s+)?(?:insert|type|enter|put|write|fill(?:\s+in)?)\s+(.+?)\s+(?:in|into|for|as)\s+(.+)$/i))) {
    const [, value = '', target = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: stripField(target), value: clean(value) } };
  }
  // "fill the email field with X"
  if ((m = t.match(/^(?:please\s+)?fill(?:\s+in)?\s+(.+?)\s+with\s+(.+)$/i))) {
    const [, target = '', value = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: stripField(target), value: clean(value) } };
  }
  // "change/set my work location to Remote"
  if ((m = t.match(/^(?:please\s+)?(?:now\s+)?(?:change|set|update|make)\s+(.+?)\s+to\s+(.+)$/i))) {
    const [, rawTarget = '', value = ''] = m;
    return changeIntent(stripField(rawTarget), clean(value), state);
  }
  // "choose/select Remote for work location"
  if ((m = t.match(/^(?:please\s+)?(?:choose|select|pick)\s+(.+?)\s+(?:in|for|as|from)\s+(.+)$/i))) {
    const [, option = '', target = ''] = m;
    return { kind: 'tool', tool: 'choose', args: { target: stripField(target), option: clean(option) } };
  }
  // "check the terms box" / "uncheck newsletter"
  if ((m = t.match(/^(?:please\s+)?(un)?(?:check|tick)\s+(.+)$/i))) {
    const [, un, target = ''] = m;
    return { kind: 'tool', tool: 'set_checked', args: { target: stripField(target), checked: !un } };
  }
  // "click submit", "press the Next button"
  if ((m = t.match(/^(?:please\s+)?(?:click|press|tap)(?:\s+on)?\s+(.+?)(?:\s+button)?[.!]?$/i))) {
    return { kind: 'tool', tool: 'click', args: { target: clean(m[1] ?? '').replace(/^the\s+/i, '') } };
  }
  // Scrolling
  if ((m = t.match(/\bscroll\s+(up|down)\b/i))) return { kind: 'tool', tool: 'scroll', args: { direction: m[1]!.toLowerCase() } };
  if (/\b(scroll|go)\s+to\s+(the\s+)?top\b/i.test(t)) return { kind: 'tool', tool: 'scroll', args: { direction: 'top' } };
  if (/\b(scroll|go)\s+to\s+(the\s+)?bottom\b/i.test(t)) return { kind: 'tool', tool: 'scroll', args: { direction: 'bottom' } };

  // Preferences
  if (/\b(bigger|larger|increase)\b.*\b(text|font)\b|\b(text|font)\b.*\b(bigger|larger)\b/i.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1.25 } };
  }
  if (/\b(smaller|decrease|reset)\b.*\b(text|font)\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1 } };
  if (/\bhigh contrast\b|\bmore contrast\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { highContrast: true } };
  if (/\b(simplify|simpler|plain language|easier)\b/i.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { simplifiedLanguage: true, showInstructions: true } };
  }
  if (/\b(bigger|larger)\s+(buttons|targets)\b/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { targetSize: 'large' } };
  if (/\b(reduce|less|stop)\s+(motion|animation)/i.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { reduceMotion: true } };

  // Questions about the form, answered straight from the Page Model.
  if (state && /\b(form|fields?|required|need to (fill|enter)|ask(s|ing)? for)\b/i.test(t)) {
    return { kind: 'answer', text: describeForm(state, 'en') };
  }
  // Reading
  if (/\b(read( (this|the))?( page)?( aloud| to me)?$|read (this|the) page|what('s| is) (on )?this page|summari[sz]e)/i.test(t)) {
    return { kind: 'tool', tool: 'read_page', args: { detail: 'summary' } };
  }
  return undefined;
}

/** "set X to Y" is a choose when X is a select/radio on the page, otherwise a fill. */
function changeIntent(target: string, value: string, state?: PageState): RoutedIntent {
  const field = fieldFor(state, target);
  if (field && CHOICE_KINDS.has(field.kind)) return { kind: 'tool', tool: 'choose', args: { target, option: value } };
  return { kind: 'tool', tool: 'fill', args: { target, value } };
}

// ---------------------------------------------------------------------------
// Amharic
//
// Amharic is verb-final, so every action pattern anchors on the verb at the end
// and reads the object(s) before it. Verb alternations cover the masculine,
// feminine and polite imperatives. `\b` does not work for Ethiopic (it is
// ASCII-only), so word edges are matched with whitespace instead.
// ---------------------------------------------------------------------------

const AM_POLITE = /^(?:እባክህ|እባክሽ|እባክዎ|እባክዎን|እባካችሁ|አሁን)\s+/;
const AM_FIELD_WORD = /\s*(?:መስክ|መስኩ|መስኩን|ሳጥን|ሳጥኑ|ሳጥኑን)$/;
/** Accusative / definite-object endings on the word that names a target or value. */
const AM_OBJECT = /(?:ውን|ዉን|ን)$/;

const V_FILL = '(?:አስገባ|አስገቢ|አስገቡ|ያስገቡ|ጻፍ|ፃፍ|ጻፊ|ፃፊ|ጻፉ|ፃፉ|ይጻፉ|ይፃፉ|ሙላ|ሙይ|ሙሉ|ይሙሉ|ተይብ|ተይቢ|ተይቡ|ይተይቡ)';
const V_CHANGE = '(?:ቀይር|ቀይሪ|ቀይሩ|ይቀይሩ|ለውጥ|ለውጪ|ለውጡ|ይለውጡ|አድርግ|አድርጊ|አድርጉ|ያድርጉ|አስተካክል|አስተካክዪ|አስተካክሉ|ያስተካክሉ)';
const V_CHOOSE = '(?:ምረጥ|ምረጪ|ምረጡ|ይምረጡ)';
const V_CHECK = '(?:ምልክት\\s+(?:አድርግ|አድርጊ|አድርጉ|ያድርጉ)|አመልክት|አመልክቺ|አመልክቱ|ያመልክቱ)';
const V_UNCHECK = '(?:ምልክት(?:ን|ቱን)?\\s+(?:አንሳ|አንሺ|አንሱ|ያንሱ)|አታመልክት|አታመልክቱ)';
const V_CLICK = '(?:ተጫን|ተጫኚ|ተጫኑ|ይጫኑ|ጫን|ጫኚ|ጫኑ|ንካ|ንኪ|ንኩ|ይንኩ|ጠቅ\\s+(?:አድርግ|አድርጊ|አድርጉ|ያድርጉ))';
const V_READ = '(?:አንብብ|አንብቢ|አንብቡ|ያንብቡ|አንብብልኝ|አንብቢልኝ|አንብቡልኝ|ያንብቡልኝ)';
const V_SUMMARIZE = '(?:አጠቃልል|አጠቃልዪ|አጠቃልሉ|ያጠቃልሉ|አጠቃልልልኝ|ማጠቃለያ)';
const V_SCROLL = '(?:ሸብልል|ሸብልዪ|ሸብልሉ|ይሸብልሉ|ሂድ|ሂጂ|ሂዱ|ይሂዱ|ውረድ|ውረጂ|ውረዱ|ይውረዱ|ውጣ|ውጪ|ውጡ|ይውጡ|አሳይ|አሳዪ|አሳዩ|ያሳዩ)';

const amClean = (s: string) => clean(s).replace(AM_POLITE, '').trim();
/** A field name as the user said it: no field/box word, no object ending, no leading "የ" (of). */
function amTarget(s: string): string {
  let out = amClean(s)
    .replace(/\s+(?:ላይ|ውስጥ)$/, '')
    .replace(AM_FIELD_WORD, '')
    .trim();
  out = out.replace(/\s+(?:የሚለውን|የሚለው|የሚል|የተባለውን|የተባለው)$/, '').trim();
  if (out.length > 2) out = out.replace(AM_OBJECT, '');
  return out.replace(/^የ/, '').trim();
}
const amValue = (s: string) => {
  const out = amClean(s);
  return out.length > 2 ? out.replace(AM_OBJECT, '') : out;
};
const has = (t: string, words: string) => new RegExp(`(?:^|\\s)(?:${words})(?:\\s|$)`).test(t);

/**
 * "ለሥራ ቦታ ርቀት ምረጥ" has no marker between the field name and the option. Try
 * every split and keep the one whose left side names a choice field on the page;
 * otherwise the last word is the option.
 */
function splitChoice(phrase: string, state?: PageState): { target: string; option: string } | undefined {
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < 2) return undefined;
  for (let i = words.length - 1; i >= 1; i--) {
    const target = amTarget(words.slice(0, i).join(' '));
    const field = fieldFor(state, target);
    if (field && CHOICE_KINDS.has(field.kind)) return { target, option: amValue(words.slice(i).join(' ')) };
  }
  return { target: amTarget(words.slice(0, -1).join(' ')), option: amValue(words[words.length - 1]!) };
}

/** "ርቀትን ምረጥ": the only choice field on the page offering that option. */
function fieldOfferingOption(state: PageState | undefined, option: string): PageField | undefined {
  const o = option.toLowerCase();
  const matches = (state?.fields ?? []).filter(
    (f) => CHOICE_KINDS.has(f.kind) && (f.options ?? []).some((x) => x.toLowerCase() === o || x.toLowerCase().includes(o))
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function routeAmharic(raw: string, state?: PageState): RoutedIntent | undefined {
  const t = raw.replace(AM_POLITE, '').replace(/[።!?]+$/, '').trim();
  let m: RegExpMatchArray | null;

  // "አበበ ቢቂላን በሙሉ ስም መስክ ውስጥ አስገባ" — value, then the field with በ/ወደ … ውስጥ/ላይ.
  if ((m = t.match(new RegExp(`^(.+?)\\s+(?:በ|ወደ)(.+?)\\s*(?:መስክ|መስኩ|ሳጥን|ሳጥኑ)?\\s*(?:ውስጥ|ላይ)\\s+${V_FILL}$`)))) {
    const [, value = '', target = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: amTarget(target), value: amValue(value) } };
  }
  // "በሙሉ ስም መስክ ውስጥ አበበ ቢቂላ አስገባ" / "ኢሜይል ላይ x@y.z ጻፍ" — the field first, then the value.
  if ((m = t.match(new RegExp(`^(?:በ|ወደ)?(.+?)\\s*(?:መስክ|መስኩ|ሳጥን|ሳጥኑ)?\\s*(?:ውስጥ|ላይ)\\s+(.+?)\\s+${V_FILL}$`)))) {
    const [, target = '', value = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: amTarget(target), value: amValue(value) } };
  }
  // "ሙሉ ስምን አበበ ቢቂላ ብለህ ሙላ/አስገባ" — field marked as object, then value, optional "ብለህ/ብለው".
  if ((m = t.match(new RegExp(`^(\\S+(?:\\s+\\S+)*?(?:ውን|ዉን|ን))\\s+(.+?)\\s+(?:ብለህ|ብለሽ|ብለው|ብላችሁ|አድርገህ|አድርገሽ|አድርገው)\\s+${V_FILL}$`)))) {
    const [, target = '', value = ''] = m;
    return { kind: 'tool', tool: 'fill', args: { target: amTarget(target), value: amValue(value) } };
  }
  // "ኢሜይሉን ወደ tsegaye@example.com ቀይር" / "የሥራ ቦታ ምርጫን ወደ ርቀት ለውጥ".
  if ((m = t.match(new RegExp(`^(.+?)\\s+(?:ወደ|በ)\\s*(.+?)\\s+${V_CHANGE}$`)))) {
    const [, target = '', value = ''] = m;
    return changeIntent(amTarget(target), amValue(value), state);
  }
  // "ለሥራ ቦታ ርቀት ምረጥ" / "ከሥራ ቦታ ርቀትን ምረጥ" / "ርቀትን ምረጥ".
  if ((m = t.match(new RegExp(`^(?:ለ|በ|ከ)(.+?)\\s+${V_CHOOSE}$`)))) {
    const split = splitChoice(m[1] ?? '', state);
    if (split) return { kind: 'tool', tool: 'choose', args: split };
  }
  if ((m = t.match(new RegExp(`^(.+?)\\s+${V_CHOOSE}$`)))) {
    const option = amValue(m[1] ?? '');
    const field = fieldOfferingOption(state, option);
    if (field) return { kind: 'tool', tool: 'choose', args: { target: field.label, option } };
    const split = splitChoice(m[1] ?? '', state);
    if (split && fieldFor(state, split.target)) return { kind: 'tool', tool: 'choose', args: split };
  }
  // "የውል ሳጥኑን ምልክት አንሳ" (uncheck) before "… ምልክት አድርግ" (check).
  if ((m = t.match(new RegExp(`^(.+?)\\s+${V_UNCHECK}$`)))) {
    return { kind: 'tool', tool: 'set_checked', args: { target: amTarget(m[1] ?? ''), checked: false } };
  }
  if ((m = t.match(new RegExp(`^(.+?)\\s+${V_CHECK}$`)))) {
    return { kind: 'tool', tool: 'set_checked', args: { target: amTarget(m[1] ?? ''), checked: true } };
  }
  // Scrolling: "ወደ ታች ውረድ", "ወደ ላይ ሸብልል", "ወደ መጨረሻው ሂድ", "ወደ መጀመሪያ ተመለስ".
  if (has(t, 'መጨረሻ|መጨረሻው|ግርጌ|ታችኛው|ታችኛውን') && (has(t, V_SCROLL.slice(3, -1)) || /ተመለስ|ተመለሱ|ይመለሱ$/.test(t))) {
    return { kind: 'tool', tool: 'scroll', args: { direction: 'bottom' } };
  }
  if (has(t, 'መጀመሪያ|መጀመሪያው|ራስጌ|አናት|ላይኛው|ላይኛውን') && (has(t, V_SCROLL.slice(3, -1)) || /ተመለስ|ተመለሱ|ይመለሱ$/.test(t))) {
    return { kind: 'tool', tool: 'scroll', args: { direction: 'top' } };
  }
  if (has(t, 'ታች') && has(t, V_SCROLL.slice(3, -1))) return { kind: 'tool', tool: 'scroll', args: { direction: 'down' } };
  if (has(t, 'ላይ') && has(t, V_SCROLL.slice(3, -1))) return { kind: 'tool', tool: 'scroll', args: { direction: 'up' } };

  // Preferences: text size, contrast, plain language, target size, motion.
  const text = /ጽሑፍ|ጽሁፍ|ፅሑፍ|ፅሁፍ|ፊደል|ፊደላት|ጽሑፉ|ጽሁፉ|ፊደሉ/.test(t);
  if (text && /አሳድግ|አሳድጊ|አሳድጉ|ያሳድጉ|ትልቅ|ከፍ\s*አድርግ|ከፍ\s*አድርጉ|ከፍ\s*ያድርጉ|ጨምር|ጨምሩ|ይጨምሩ/.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1.25 } };
  }
  if (text && /አሳንስ|አሳንሺ|አሳንሱ|ያሳንሱ|ትንሽ|ቀንስ|ቀንሱ|ይቀንሱ|መደበኛ/.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { fontScale: 1 } };
  }
  if (/ንፅፅር|ንጽጽር|ንፅፅሩ|ንጽጽሩ/.test(t)) return { kind: 'tool', tool: 'set_preferences', args: { highContrast: true } };
  if (/ቀላል|ቀለል|ግልጽ|ግልፅ|ቀለል\s*ያለ/.test(t) && /ቋንቋ|ቃላት|አድርግ|አድርጊ|አድርጉ|ያድርጉ|አብራራ|አብራሩ|ያብራሩ|አስረዳ|አስረዱ/.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { simplifiedLanguage: true, showInstructions: true } };
  }
  if (/ቁልፎች|ቁልፎቹ|አዝራሮች|አዝራሮቹ/.test(t) && /አሳድግ|አሳድጊ|አሳድጉ|ያሳድጉ|ትልቅ|ትላልቅ/.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { targetSize: 'large' } };
  }
  if (/እንቅስቃሴ|እንቅስቃሴውን|አኒሜሽን|አኒሜሽኑን/.test(t) && /ቀንስ|ቀንሺ|ቀንሱ|ይቀንሱ|አቁም|አቁሚ|አቁሙ|ያቁሙ|አጥፋ|አጥፊ|አጥፉ|ያጥፉ/.test(t)) {
    return { kind: 'tool', tool: 'set_preferences', args: { reduceMotion: true } };
  }

  // "ቀጣይ የሚለውን ተጫን", "ማመልከቻ አስገባ ቁልፉን ተጫን". After scrolling so "ወደ ታች ሂድ" is not a click.
  if ((m = t.match(new RegExp(`^(.+?)\\s*(?:ቁልፍ|ቁልፉ|ቁልፉን|አዝራር|አዝራሩ|አዝራሩን)?\\s+${V_CLICK}$`)))) {
    return { kind: 'tool', tool: 'click', args: { target: amTarget(m[1] ?? '') } };
  }

  // Reading the page: "ገጹን አንብብልኝ", "ይህ ገጽ ምንድን ነው?", "አጠቃልልልኝ".
  if (
    new RegExp(`(?:^|\\s)(?:ገጹን|ገፁን|ገጹ|ገፁ|ገጽ|ገፅ|ይህን|ይህንን|ይህን ገጽ|ይህንን ገጽ)?\\s*${V_READ}$`).test(t) ||
    new RegExp(`${V_SUMMARIZE}$`).test(t) ||
    /ይህ\s+ገ[ጽፅ]\s+(?:ምንድን|ምን)\s+ነው|ገ[ጽፅ]ኡ?\s+ስለ\s+ምን(?:ድን)?\s+ነው/.test(t)
  ) {
    return { kind: 'tool', tool: 'read_page', args: { detail: 'summary' } };
  }
  // Questions about the form, answered from the Page Model.
  if (state && /ቅጽ|ቅፅ|ፎርም|መስኮች|ግዴታ|አስፈላጊ|መሙላት|ይጠይቃል|ያስፈልጋል|ይፈልጋል/.test(t)) {
    return { kind: 'answer', text: describeForm(state, 'am') };
  }
  return undefined;
}

export const ROUTER_HELP =
  'I can do that with the AI assistant switched on. Without it I understand requests like “insert Abebe Bikila in the Full Name field”, “change work location to Remote”, “check the terms box”, “click Next”, “what does this form ask?”, “make the text bigger” or “read this page”.';

export const ROUTER_HELP_AM =
  'ይህን ለማድረግ የAI ረዳቱ መብራት አለበት። ያለሱ እንደ “በሙሉ ስም መስክ ውስጥ አበበ ቢቂላ አስገባ”፣ “የሥራ ቦታን ወደ ርቀት ቀይር”፣ “የውል ሳጥኑን ምልክት አድርግ”፣ “ቀጣይ የሚለውን ተጫን”፣ “ይህ ቅጽ ምን ይጠይቃል?”፣ “ጽሑፉን አሳድግ” ወይም “ገጹን አንብብልኝ” ያሉ ጥያቄዎችን እረዳለሁ።';

export const routerHelp = (lang: RouterLanguage): string => (lang === 'am' ? ROUTER_HELP_AM : ROUTER_HELP);

function lastToolOutput(messages: ModelMessage[]): Record<string, unknown> | undefined {
  const last = [...messages].reverse().find((m) => m.role === 'tool');
  const part = Array.isArray(last?.content) ? (last.content[0] as { output?: { value?: unknown } }) : undefined;
  const value = part?.output?.value;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function answerFromOutput(tool: AgentToolName, out: Record<string, unknown> | undefined, lang: RouterLanguage): string {
  const am = lang === 'am';
  if (!out) return am ? 'ተከናውኗል።' : 'Done.';
  if (out.ok === false) return String(out.message ?? (am ? 'ያ አልሰራም።' : 'That did not work.'));
  if (tool === 'read_page') {
    const data = out.data as { title?: string; headings?: Array<{ text?: string } | string>; readableContent?: string } | undefined;
    const headings = (data?.headings ?? []).map((h) => (typeof h === 'string' ? h : h.text ?? '')).filter(Boolean);
    const body = data?.readableContent ? `\n\n${data.readableContent.slice(0, 600)}…` : '';
    const sections = headings.length ? `\n\n${am ? 'ክፍሎች' : 'Sections'}: ${headings.slice(0, 8).join(', ')}` : '';
    return `**${data?.title ?? (am ? 'ይህ ገጽ' : 'This page')}**${sections}${body}`;
  }
  const summary = String(out.summary ?? (am ? 'ተጠናቋል' : 'finished'));
  return am ? `ተከናውኗል — ${summary}።` : `Done — ${summary}.`.replace(/\.\.$/, '.');
}

/**
 * A CallModel backed by the router, so offline requests run through the same loop,
 * guards, policy and confirmation as model requests. Answers in the user's language.
 */
export function createRouterCallModel(userGoal: string, state?: PageState): CallModel {
  const lang = routerLanguage(userGoal);
  const intent = routeIntent(userGoal, state);
  return async (req) => {
    const toolResultsSoFar = req.messages.filter((m) => m.role === 'tool').length;
    let text: string;
    if (!intent) text = routerHelp(lang);
    else if (intent.kind === 'answer') text = intent.text;
    else if (toolResultsSoFar === 0 && req.toolChoice !== 'none') {
      const call: ModelToolCall = { toolCallId: 'router_1', toolName: intent.tool, input: intent.args };
      return { text: '', toolCalls: [call] };
    } else text = answerFromOutput(intent.tool, lastToolOutput(req.messages), lang);
    req.onText(text);
    return { text, toolCalls: [] };
  };
}
