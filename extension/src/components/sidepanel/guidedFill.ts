import { isPlausibleDictation, normalizeDictation, type DictationFormat } from '@tederash/core';
import type { PageField, PageState, ToolResult } from '../../shared/tools';

/**
 * Guided spoken form filling: one field at a time, as a fixed script rather than a
 * model loop. The assistant reads what a field needs, opens the mic for one answer,
 * spells back what it heard, and writes it into the page only after the user says
 * yes. Corrections loop back to the read-back; nothing is filled unconfirmed.
 *
 * Pure apart from the injected `GuidedDeps`, so the whole conversation is
 * unit-testable with a scripted speaker and listener.
 */

export type GuidedLang = 'en' | 'am' | 'om';

export type GuidedPhase = 'asking' | 'listening' | 'confirming' | 'filling' | 'sensitive' | 'submitting' | 'done' | 'stopped';

export interface GuidedUiState {
  phase: GuidedPhase;
  index: number;
  total: number;
  label?: string;
  /** What the assistant just said (also shown on screen). */
  spoken?: string;
  /** The value waiting for confirmation, and its spelling. */
  heard?: string;
  spelled?: string;
}

export interface GuidedDeps {
  lang: GuidedLang;
  /** Speak and resolve once speech has finished (so the mic can open safely). */
  speak: (text: string) => Promise<void>;
  /** Open the mic for one utterance; resolve with the text, or undefined if nothing usable was heard. */
  listen: () => Promise<string | undefined>;
  /** Run one page tool through the executor. `confirmed` only after the user said yes to that action. */
  exec: (tool: 'fill' | 'choose' | 'set_checked' | 'click', args: Record<string, unknown>, confirmed?: boolean) => Promise<ToolResult>;
  getPageState: () => Promise<PageState | undefined>;
  onState: (state: GuidedUiState) => void;
  /** Set to true to end the conversation (Stop button). */
  shouldStop?: () => boolean;
}

// ---------------------------------------------------------------------------
// Strings (en / am / om). Kept here, next to the script that speaks them.
// ---------------------------------------------------------------------------

type Strings = {
  intro: (n: number) => string;
  required: string;
  optional: string;
  askText: string;
  askChoice: (options: string) => string;
  askCheck: string;
  current: (v: string) => string;
  heard: (v: string, spelled: string) => string;
  heardChoice: (v: string) => string;
  isRight: string;
  notHeard: string;
  invalid: (kind: 'email' | 'tel') => string;
  sayAgain: string;
  noMatch: (options: string) => string;
  sensitive: (label: string) => string;
  filled: (label: string) => string;
  checked: (label: string, on: boolean) => string;
  fillFailed: (msg: string) => string;
  skipped: string;
  summary: (n: number) => string;
  submitQ: (label: string) => string;
  submitted: string;
  notSubmitted: string;
  stopped: string;
  noFields: string;
  at: string;
  dot: string;
  space: string;
};

const STRINGS: Record<GuidedLang, Strings> = {
  en: {
    intro: (n) => `This form has ${n} fields. I will ask them one at a time. Say skip, back, repeat or stop at any time.`,
    required: 'Required.',
    optional: 'Optional.',
    askText: 'Please say your answer.',
    askChoice: (o) => `The options are: ${o}. Say one.`,
    askCheck: 'Say yes or no.',
    current: (v) => `It currently says ${v}. Say keep, or say a new answer.`,
    heard: (v, s) => `I heard ${v}. Spelled: ${s}.`,
    heardChoice: (v) => `You chose ${v}.`,
    isRight: 'Is that right? Say yes, no, or say it again.',
    notHeard: "I didn't catch that. Please say it again.",
    invalid: (kind) => (kind === 'email' ? 'That does not sound like an email address. Say it again, for example: name at example dot com.' : 'That does not sound like a phone number. Say the digits one by one.'),
    sayAgain: 'Okay, please say it again.',
    noMatch: (o) => `That is not one of the options. The options are: ${o}.`,
    sensitive: (l) => `${l} is private. Please type it yourself, then say done.`,
    filled: (l) => `Done. ${l} is filled.`,
    checked: (l, on) => `${l} is ${on ? 'ticked' : 'not ticked'}.`,
    fillFailed: (m) => `That did not work: ${m}. Please say it again.`,
    skipped: 'Skipped.',
    summary: (n) => `All done. I filled ${n} ${n === 1 ? 'field' : 'fields'}.`,
    submitQ: (l) => `Do you want me to press ${l} now? Say yes or no.`,
    submitted: 'Submitted.',
    notSubmitted: 'I did not submit. You can review the form and submit it yourself.',
    stopped: 'Stopped. Your answers so far are kept.',
    noFields: 'I could not find any fields to fill on this page.',
    at: 'at',
    dot: 'dot',
    space: 'space',
  },
  am: {
    intro: (n) => `ይህ ቅጽ ${n} መስኮች አሉት። አንድ በአንድ እጠይቅዎታለሁ። በማንኛውም ጊዜ ዝለል፣ ተመለስ፣ ድገም ወይም አቁም ማለት ይችላሉ።`,
    required: 'ግዴታ ነው።',
    optional: 'አማራጭ ነው።',
    askText: 'እባክዎ መልስዎን ይናገሩ።',
    askChoice: (o) => `አማራጮቹ፦ ${o} ናቸው። አንዱን ይናገሩ።`,
    askCheck: 'አዎ ወይም አይ ይበሉ።',
    current: (v) => `አሁን “${v}” ይላል። ይቆይ ይበሉ፣ ወይም አዲስ መልስ ይናገሩ።`,
    heard: (v, s) => `“${v}” ሰማሁ። በፊደል፦ ${s}።`,
    heardChoice: (v) => `“${v}” መርጠዋል።`,
    isRight: 'ትክክል ነው? አዎ፣ አይ ይበሉ፣ ወይም እንደገና ይናገሩ።',
    notHeard: 'አልሰማሁም። እባክዎ እንደገና ይናገሩ።',
    invalid: (kind) => (kind === 'email' ? 'ያ የኢሜይል አድራሻ አይመስልም። እንደገና ይናገሩ፣ ለምሳሌ፦ ስም አት example ነጥብ com።' : 'ያ የስልክ ቁጥር አይመስልም። አሃዞቹን አንድ በአንድ ይናገሩ።'),
    sayAgain: 'እሺ፣ እባክዎ እንደገና ይናገሩ።',
    noMatch: (o) => `ያ ከአማራጮቹ አንዱ አይደለም። አማራጮቹ፦ ${o} ናቸው።`,
    sensitive: (l) => `${l} የግል መረጃ ነው። እባክዎ ራስዎ ይተይቡት፣ ከዚያ ጨርሻለሁ ይበሉ።`,
    filled: (l) => `ተከናውኗል። ${l} ተሞልቷል።`,
    checked: (l, on) => `${l} ${on ? 'ምልክት ተደርጓል' : 'ምልክት አልተደረገም'}።`,
    fillFailed: (m) => `አልሰራም፦ ${m}። እባክዎ እንደገና ይናገሩ።`,
    skipped: 'ተዘሏል።',
    summary: (n) => `ተጠናቋል። ${n} መስኮችን ሞልቻለሁ።`,
    submitQ: (l) => `አሁን “${l}” እንድጫን ይፈልጋሉ? አዎ ወይም አይ ይበሉ።`,
    submitted: 'ተልኳል።',
    notSubmitted: 'አልላክሁም። ቅጹን ገምግመው ራስዎ መላክ ይችላሉ።',
    stopped: 'ቆሟል። እስካሁን የሰጡት መልስ ተቀምጧል።',
    noFields: 'በዚህ ገጽ ላይ የሚሞሉ መስኮች አላገኘሁም።',
    at: 'አት',
    dot: 'ነጥብ',
    space: 'ክፍተት',
  },
  om: {
    intro: (n) => `Unkaan kun dirree ${n} qaba. Tokko tokkoon isin gaafadha. Yeroo kamiyyuu irra darbi, deebi'i, irra deebi'i ykn dhaabi jechuu dandeessu.`,
    required: 'Dirqama.',
    optional: 'Filannoo.',
    askText: 'Maaloo deebii kee dubbadhu.',
    askChoice: (o) => `Filannoowwan: ${o}. Tokko dubbadhu.`,
    askCheck: 'Eeyyee ykn lakki jedhi.',
    current: (v) => `Amma “${v}” jedha. Haa turu jedhi, ykn deebii haaraa dubbadhu.`,
    heard: (v, s) => `“${v}” dhagaʼe. Qubeen: ${s}.`,
    heardChoice: (v) => `“${v}” filatte.`,
    isRight: 'Sirriidhaa? Eeyyee, lakki jedhi, ykn irra deebiʼii dubbadhu.',
    notHeard: 'Hin dhageenye. Maaloo irra deebiʼii dubbadhu.',
    invalid: (kind) => (kind === 'email' ? 'Sun teessoo imeelii hin fakkaatu. Irra deebiʼii dubbadhu, fakkeenyaaf: maqaa at example tuqaa com.' : 'Sun lakkoofsa bilbilaa hin fakkaatu. Lakkoofsota tokko tokkoon dubbadhu.'),
    sayAgain: 'Tole, maaloo irra deebiʼii dubbadhu.',
    noMatch: (o) => `Sun filannoo keessaa miti. Filannoowwan: ${o}.`,
    sensitive: (l) => `${l} odeeffannoo dhuunfaa ti. Maaloo ofii barreessi, achiis xumureera jedhi.`,
    filled: (l) => `Xumurameera. ${l} guutameera.`,
    checked: (l, on) => `${l} ${on ? 'mallattoo qaba' : 'mallattoo hin qabu'}.`,
    fillFailed: (m) => `Hin hojjenne: ${m}. Maaloo irra deebiʼii dubbadhu.`,
    skipped: 'Irra darbameera.',
    summary: (n) => `Xumurameera. Dirree ${n} guuteera.`,
    submitQ: (l) => `Amma “${l}” akkan tuqu barbaaddaa? Eeyyee ykn lakki jedhi.`,
    submitted: 'Ergameera.',
    notSubmitted: 'Hin ergine. Unka ilaaltee ofii erguu dandeessa.',
    stopped: 'Dhaabbateera. Deebiin kee hanga ammaa ni eegama.',
    noFields: 'Fuula kana irratti dirree guutamu hin arganne.',
    at: 'at',
    dot: 'tuqaa',
    space: 'iddoo duwwaa',
  },
};

export const guidedStrings = (lang: GuidedLang) => STRINGS[lang];

/** Profile / speech language tag → guided language. */
export function guidedLangFor(tag?: string): GuidedLang {
  const t = (tag ?? '').toLowerCase();
  if (t.startsWith('am')) return 'am';
  if (t.startsWith('om')) return 'om';
  return 'en';
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export type ReplyKind = 'yes' | 'no' | 'skip' | 'back' | 'repeat' | 'stop' | 'keep' | 'done' | 'value';

const WORDS: Record<Exclude<ReplyKind, 'value'>, string[]> = {
  // Order of checks matters: "irra deebi'i" (repeat) contains "deebi'i" (back).
  repeat: ['repeat', 'say again', 'again', 'pardon', 'ድገም', 'እንደገና ድገም', "irra deebi'i", 'irra deebii'],
  stop: ['stop', 'cancel', 'quit', 'exit', 'አቁም', 'ይቁም', 'ተው', 'dhaabi', 'dhaabbadhu'],
  skip: ['skip', 'next', 'skip it', 'ዝለል', 'ዝለለው', 'ቀጣይ', 'irra darbi'],
  back: ['back', 'go back', 'previous', 'ተመለስ', 'ወደኋላ', "deebi'i", 'deebii'],
  keep: ['keep', 'keep it', 'leave it', 'ይቆይ', 'እንዳለ ይቆይ', 'haa turu'],
  done: ['done', 'finished', "i'm done", 'ጨርሻለሁ', 'ጨረስኩ', 'xumureera', 'xumureen jira'],
  yes: ['yes', 'yeah', 'yep', 'yup', 'correct', 'right', "that's right", 'that is right', 'ok', 'okay', 'sure', 'አዎ', 'አዎን', 'ትክክል', 'ትክክል ነው', 'እሺ', 'eeyyee', 'eeyye', 'eeyee', 'sirrii', 'sirriidha', 'tole'],
  no: ['no', 'nope', 'wrong', 'incorrect', 'not right', 'አይ', 'አይደለም', 'ተሳስቷል', 'ስህተት', 'lakki', 'miti', 'dogoggora'],
};

const ORDER: Array<Exclude<ReplyKind, 'value'>> = ['repeat', 'stop', 'skip', 'back', 'keep', 'done', 'yes', 'no'];

const tidy = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,!?።፣፤"“”]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** A short reply that is a command or yes/no; anything else is a value. */
export function classifyReply(text: string): ReplyKind {
  const t = tidy(text);
  if (!t || t.split(' ').length > 4) return 'value';
  for (const kind of ORDER) {
    if (WORDS[kind].some((w) => t === w || t === `${w} please` || t.startsWith(`${w} `) && t.split(' ').length <= 3)) {
      return kind;
    }
  }
  return 'value';
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const CHOICE_KINDS = new Set(['select', 'combobox', 'radio']);
const CHECK_KINDS = new Set(['checkbox', 'switch']);
const SKIP_KINDS = new Set(['color', 'range', 'date', 'datetime-local', 'month', 'week', 'time']);

export const isChoiceField = (f: PageField) => CHOICE_KINDS.has(f.kind);
export const isCheckField = (f: PageField) => CHECK_KINDS.has(f.kind);

function formatFor(field: PageField): DictationFormat {
  if (field.kind === 'email') return 'email';
  if (field.kind === 'tel') return 'tel';
  return 'text';
}

/** The page value to enter for a spoken answer to a text field. */
export function normalizeAnswer(field: PageField, text: string): string {
  const format = formatFor(field);
  // Transcribers add sentence punctuation ("Abebe Bikila."); a field value should not carry it.
  let value = normalizeDictation(text, format).replace(/[.!?。！？።,，、;:]+$/u, '');
  if (format === 'tel') value = value.replace(/[^\d+]/g, '');
  if (field.kind === 'number') value = value.replace(/[^\d.,-]/g, '');
  return value.trim();
}

/** Why a heard email/phone answer cannot be right, if it cannot; undefined when it is plausible. */
export function implausibleAnswer(field: PageField, value: string): 'email' | 'tel' | undefined {
  const format = formatFor(field);
  if (format === 'text') return undefined;
  return isPlausibleDictation(value, format) ? undefined : format;
}

/** Best option for a spoken choice, or undefined when nothing fits. */
export function matchOption(options: string[], spoken: string): string | undefined {
  const s = tidy(spoken);
  if (!s) return undefined;
  const usable = options.filter((o) => o.trim() && !/^(pick|choose|select)\b|^ይምረጡ$|^filadhu$/i.test(o.trim()));
  const low = usable.map((o) => [o, tidy(o)] as const);
  return (
    low.find(([, o]) => o === s)?.[0] ??
    low.find(([, o]) => o.startsWith(s) || s.startsWith(o))?.[0] ??
    low.find(([, o]) => o.includes(s) || s.includes(o))?.[0] ??
    low.find(([, o]) => o.split(' ').some((w) => w.length > 2 && s.split(' ').includes(w)))?.[0]
  );
}

const ETHIOPIC = /[ሀ-፿]/;

/**
 * How a value is spelled back: Latin letters one by one, digits one by one,
 * email with "at"/"dot", Ge'ez text syllable by syllable (each fidel is a syllable).
 */
export function spellOut(value: string, lang: GuidedLang): string {
  const S = STRINGS[lang];
  const words = value.trim().split(/\s+/).filter(Boolean);
  const spellWord = (word: string) =>
    [...word]
      .map((ch) => {
        if (ch === '@') return S.at;
        if (ch === '.') return S.dot;
        if (ETHIOPIC.test(ch)) return ch;
        return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
      })
      .join(', ');
  return words.map(spellWord).join(`; ${S.space}; `);
}

/** Visible label for spoken prompts, without a trailing "*". */
const labelOf = (f: PageField) => f.label.replace(/\s*\*\s*$/, '').trim();

export function promptFor(field: PageField, lang: GuidedLang): string {
  const S = STRINGS[lang];
  const parts = [`${labelOf(field)}.`, field.required ? S.required : S.optional];
  if (field.error) parts.push(`${field.error}.`);
  if (isChoiceField(field)) parts.push(S.askChoice(choiceOptions(field).join(', ')));
  else if (isCheckField(field)) parts.push(S.askCheck);
  else if (field.value && !field.sensitive) parts.push(S.current(field.value));
  else parts.push(S.askText);
  return parts.join(' ');
}

const choiceOptions = (f: PageField) =>
  (f.options ?? []).filter((o) => o.trim() && !/^(pick|choose|select)\b|^ይምረጡ$|^filadhu$/i.test(o.trim()));

/** Fields worth asking about, in page order. */
export function askableFields(state: PageState): PageField[] {
  return state.fields.filter((f) => !f.disabled && !SKIP_KINDS.has(f.kind));
}

// ---------------------------------------------------------------------------
// The conversation
// ---------------------------------------------------------------------------

const MAX_MISSES = 3;

export async function runGuidedFill(deps: GuidedDeps): Promise<{ filled: number; stopped: boolean }> {
  const S = STRINGS[deps.lang];
  const page = await deps.getPageState();
  const fields = page ? askableFields(page) : [];
  const total = fields.length;
  let filled = 0;

  const say = async (text: string, state: Partial<GuidedUiState>) => {
    deps.onState({ phase: 'asking', index: 0, total, ...state, spoken: text });
    await deps.speak(text);
  };
  const hear = async (state: Partial<GuidedUiState>) => {
    if (deps.shouldStop?.()) return 'stop';
    deps.onState({ phase: 'listening', index: 0, total, ...state });
    return deps.listen();
  };
  const stop = async () => {
    await say(S.stopped, { phase: 'stopped' });
    return { filled, stopped: true };
  };

  if (total === 0) {
    await say(S.noFields, { phase: 'done' });
    return { filled, stopped: false };
  }
  await say(S.intro(total), { phase: 'asking' });

  let i = 0;
  fieldLoop: while (i < total) {
    if (deps.shouldStop?.()) return stop();
    const field = fields[i]!;
    const base = { index: i + 1, total, label: labelOf(field) };

    if (field.sensitive) {
      await say(S.sensitive(labelOf(field)), { ...base, phase: 'sensitive' });
      for (;;) {
        const r = await hear({ ...base, phase: 'sensitive' });
        const k = r ? classifyReply(r) : 'value';
        if (k === 'stop') return stop();
        if (k === 'back') {
          i = Math.max(0, i - 1);
          continue fieldLoop;
        }
        if (k === 'done' || k === 'yes' || k === 'skip') break;
      }
      i++;
      continue;
    }

    await say(promptFor(field, deps.lang), { ...base, phase: 'asking' });
    let misses = 0;

    askLoop: for (;;) {
      const reply = await hear({ ...base, phase: 'listening' });
      if (!reply) {
        misses++;
        if (misses >= MAX_MISSES) {
          await say(S.skipped, base);
          i++;
          continue fieldLoop;
        }
        await say(S.notHeard, base);
        continue;
      }
      const kind = classifyReply(reply);
      if (kind === 'stop') return stop();
      if (kind === 'skip') {
        await say(S.skipped, base);
        i++;
        continue fieldLoop;
      }
      if (kind === 'back') {
        i = Math.max(0, i - 1);
        continue fieldLoop;
      }
      if (kind === 'repeat') {
        await say(promptFor(field, deps.lang), base);
        continue;
      }
      if (kind === 'keep' && field.value) {
        i++;
        continue fieldLoop;
      }

      // Checkbox: the yes/no answer is the value.
      if (isCheckField(field)) {
        if (kind !== 'yes' && kind !== 'no') {
          await say(S.askCheck, base);
          continue;
        }
        const on = kind === 'yes';
        deps.onState({ ...base, phase: 'filling' });
        const res = await deps.exec('set_checked', { target: field.handle, checked: on });
        if (!res.ok) {
          await say(S.fillFailed(res.error.message), base);
          continue;
        }
        filled++;
        await say(S.checked(labelOf(field), on), base);
        i++;
        continue fieldLoop;
      }

      // A bare yes/no is not an answer to an open question: ask again.
      if ((kind === 'yes' || kind === 'no') && !isChoiceField(field)) {
        await say(promptFor(field, deps.lang), base);
        continue;
      }

      // Text or choice: confirm before writing.
      let candidate = isChoiceField(field) ? matchOption(choiceOptions(field), reply) : normalizeAnswer(field, reply);
      for (;;) {
        if (!candidate) {
          await say(isChoiceField(field) ? S.noMatch(choiceOptions(field).join(', ')) : S.notHeard, base);
          continue askLoop;
        }
        const bad = isChoiceField(field) ? undefined : implausibleAnswer(field, candidate);
        if (bad) {
          await say(S.invalid(bad), base);
          continue askLoop;
        }
        const spelled = isChoiceField(field) ? undefined : spellOut(candidate, deps.lang);
        const readBack = `${isChoiceField(field) ? S.heardChoice(candidate) : S.heard(candidate, spelled!)} ${S.isRight}`;
        await say(readBack, { ...base, phase: 'confirming', heard: candidate, spelled });
        const answer = await hear({ ...base, phase: 'confirming', heard: candidate, spelled });
        if (!answer) {
          await say(S.notHeard, { ...base, phase: 'confirming', heard: candidate, spelled });
          continue;
        }
        const k = classifyReply(answer);
        if (k === 'stop') return stop();
        if (k === 'skip') {
          await say(S.skipped, base);
          i++;
          continue fieldLoop;
        }
        if (k === 'back') {
          i = Math.max(0, i - 1);
          continue fieldLoop;
        }
        if (k === 'repeat') continue;
        if (k === 'no') {
          await say(S.sayAgain, base);
          continue askLoop;
        }
        if (k === 'yes') {
          deps.onState({ ...base, phase: 'filling', heard: candidate, spelled });
          const res = isChoiceField(field)
            ? await deps.exec('choose', { target: field.handle, option: candidate })
            : await deps.exec('fill', { target: field.handle, value: candidate });
          if (!res.ok) {
            await say(S.fillFailed(res.error.message), base);
            continue askLoop;
          }
          filled++;
          await say(S.filled(labelOf(field)), base);
          i++;
          continue fieldLoop;
        }
        // Anything else is a correction: read the new value back.
        candidate = isChoiceField(field) ? matchOption(choiceOptions(field), answer) : normalizeAnswer(field, answer);
      }
    }
  }

  await say(S.summary(filled), { phase: 'done', index: total, total });

  const submit = page?.buttons.find((b) => b.submit && !b.disabled);
  if (submit) {
    await say(S.submitQ(submit.label), { phase: 'submitting', index: total, total, label: submit.label });
    const r = await hear({ phase: 'submitting', index: total, total, label: submit.label });
    if (r && classifyReply(r) === 'yes') {
      // The user just said yes to this exact button: that is the confirmation the policy asks for.
      const res = await deps.exec('click', { target: submit.handle }, true);
      await say(res.ok ? S.submitted : S.fillFailed(res.error.message), { phase: 'done', index: total, total });
    } else {
      await say(S.notSubmitted, { phase: 'done', index: total, total });
    }
  }
  deps.onState({ phase: 'done', index: total, total });
  return { filled, stopped: false };
}
