import * as React from "react";
import {
  dictationFormatForInputType,
  rankDictationCandidates,
  useAccessibility,
  useSpeechRecognition,
  useSpeechSynthesis,
  type DictationFormat,
} from "@tederash/react";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useLocalization } from "../localization/useLocalization";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";

type TextField = HTMLInputElement | HTMLTextAreaElement;

/** Input types where dictation is unsafe or meaningless. */
const NON_DICTATABLE_INPUT_TYPES = new Set([
  "password",
  "hidden",
  "file",
  "number",
  "range",
  "color",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "checkbox",
  "radio",
]);

export interface FieldSpeechOptions {
  /** Ref to the underlying input/textarea element */
  fieldRef: React.RefObject<TextField | null>;
  /** id of the field (used for aria-controls) */
  fieldId: string;
  /** Visible label, used in button names and the spoken readout */
  label?: string;
  /** Currently displayed description (respects simplified language) */
  description?: string;
  /** Current error message */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** For inputs: the `type` attribute; password and similar types never offer dictation */
  inputType?: string;
  /** Developer opt-in: this field supports dictation (shown only if the profile also enables it) */
  speechInput?: boolean;
  /** Developer opt-in: this field supports read-aloud (shown only if the profile also enables it) */
  speechOutput?: boolean;
}

/**
 * Replaces the field's value with the reviewed dictation, then dispatches a
 * native `input` event so React `onChange` handlers (controlled or
 * uncontrolled) observe the change exactly like typing. Only called after
 * the user explicitly confirms in the review panel. Respects `maxLength`.
 */
export function setFieldValue(el: TextField, text: string): void {
  let next = text.trim();
  if (el.maxLength > 0) next = next.slice(0, el.maxLength);
  if (next === el.value) return;

  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setValue) setValue.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Voice dictation and read-aloud for a single text field. A feature is shown
 * only when BOTH the developer opted the field in (`speechInput` /
 * `speechOutput` prop) AND the user's profile enables it
 * (`speech.speechInput` / `speech.speechOutput`), and the browser supports
 * the corresponding Web Speech API.
 */
function useFieldSpeech(options: FieldSpeechOptions) {
  const {
    fieldRef,
    label,
    description,
    error,
    required,
    disabled,
    readOnly,
    inputType,
    speechInput,
    speechOutput,
  } = options;
  const { adaptations, profile, announce } = useAccessibility();
  const { t } = useLocalization();
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const dictationAllowedForType =
    !inputType || !NON_DICTATABLE_INPUT_TYPES.has(inputType.toLowerCase());

  const canDictate =
    Boolean(speechInput) &&
    adaptations.speechInputEnabled &&
    recognition.isSupported &&
    dictationAllowedForType &&
    !disabled &&
    !readOnly;

  const canReadAloud =
    Boolean(speechOutput) && adaptations.speechOutputEnabled && synthesis.isSupported;

  const fieldName = label || t("labels.thisField");

  const micRef = React.useRef<HTMLButtonElement>(null);
  const { transcript, alternatives } = recognition;

  // Review-before-insert: recognized text is never written into the field
  // directly. When a session ends with text, the user reviews it (edit, pick
  // an alternative match, retry or discard) and explicitly inserts it.
  const [reviewResolved, setReviewResolved] = React.useState(true);
  // Structured fields (email, tel) convert spoken symbols / spelled letters and
  // rank plausible values first; prose fields keep the engine's order.
  const format: DictationFormat = dictationFormatForInputType(inputType);
  const candidates = React.useMemo(() => {
    const list = alternatives.length > 0 ? alternatives : transcript ? [transcript] : [];
    return rankDictationCandidates(list, format);
  }, [alternatives, transcript, format]);
  const reviewOpen =
    canDictate && !recognition.isListening && !reviewResolved && candidates.length > 0;

  // Announce session end / failure (start is announced in startDictation).
  const wasListeningRef = React.useRef(false);
  React.useEffect(() => {
    if (wasListeningRef.current && !recognition.isListening) {
      if (recognition.error) {
        announce({ message: t("errors.dictationFailed"), priority: "assertive", category: "error" });
      } else if (!transcript.trim()) {
        announce({ message: t("announcements.listeningStopped"), priority: "polite", category: "info" });
      }
    }
    wasListeningRef.current = recognition.isListening;
  }, [recognition.isListening, recognition.error, transcript, announce, t]);

  // Announce the review once it opens (or when a late final result updates it).
  const bestCandidate = candidates[0] ?? "";
  React.useEffect(() => {
    if (reviewOpen && bestCandidate) {
      announce({
        message: t("announcements.dictationReview", { text: bestCandidate }),
        priority: "polite",
        category: "info",
      });
    }
  }, [reviewOpen, bestCandidate, announce, t]);

  // Stop an active session if the field becomes unavailable.
  const { isListening, abortListening } = recognition;
  React.useEffect(() => {
    if (!canDictate && isListening) abortListening();
  }, [canDictate, isListening, abortListening]);

  const startDictation = () => {
    recognition.resetTranscript();
    setReviewResolved(false);
    const listeningKey =
      format === "email"
        ? "announcements.listeningEmail"
        : format === "tel"
        ? "announcements.listeningTel"
        : "announcements.listening";
    // Not read aloud: the microphone opens now and would transcribe the speech output.
    announce({ message: t(listeningKey), priority: "polite", category: "info", spoken: false });
    recognition.startListening({
      lang: adaptations.language,
      interimResults: true,
      maxAlternatives: 5,
    });
  };

  const toggleDictation = () => {
    if (recognition.isListening) {
      recognition.stopListening();
      return;
    }
    startDictation();
  };

  const insertReviewed = (text: string) => {
    const el = fieldRef.current;
    setReviewResolved(true);
    if (!el || !text.trim()) return;
    const replaced = el.value.trim() !== "";
    setFieldValue(el, text);
    announce({
      message: t(replaced ? "announcements.dictationReplaced" : "announcements.dictationInserted", {
        field: fieldName,
      }),
      priority: "polite",
      category: "success",
    });
    el.focus();
  };

  const discardReview = () => {
    setReviewResolved(true);
    announce({ message: t("announcements.dictationDiscarded"), priority: "polite", category: "info" });
    micRef.current?.focus();
  };

  const readoutText = [
    `${fieldName}.`,
    required ? t("labels.required") + "." : "",
    description ?? "",
    error ? `${t("labels.errorPrefix")} ${error}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const toggleReadAloud = () => {
    if (synthesis.isSpeaking) {
      synthesis.cancel();
      return;
    }
    synthesis.speak(readoutText, {
      lang: adaptations.language,
      rate: profile.speech?.speechRate,
    });
  };

  return {
    canDictate,
    canReadAloud,
    hasControls: canDictate || canReadAloud,
    fieldName,
    readoutText,
    isListening: recognition.isListening,
    interimTranscript: recognition.interimTranscript,
    dictationError: recognition.error,
    isSpeaking: synthesis.isSpeaking,
    micRef,
    format,
    tip:
      format === "email"
        ? t("labels.dictationTipEmail")
        : format === "tel"
        ? t("labels.dictationTipTel")
        : t("labels.dictationTipText"),
    /** Whether confirming will overwrite text already in the field */
    fieldHasText: () => (fieldRef.current?.value.trim() ?? "") !== "",
    reviewOpen,
    candidates,
    toggleDictation,
    retryDictation: () => {
      startDictation();
      // The review panel (and its Try again button) unmounts; keep focus on the mic.
      micRef.current?.focus();
    },
    insertReviewed,
    discardReview,
    toggleReadAloud,
  };
}

type FieldSpeechState = ReturnType<typeof useFieldSpeech>;

/**
 * Whether a field should mount speech support at all (developer opt-in AND
 * profile enabled). Speech hooks are only mounted when this is true, so
 * fields pay no cost while speech is off.
 */
export function isFieldSpeechWanted(
  adaptations: { speechInputEnabled: boolean; speechOutputEnabled: boolean },
  speechInput?: boolean,
  speechOutput?: boolean
): boolean {
  return Boolean(
    (speechInput && adaptations.speechInputEnabled) ||
      (speechOutput && adaptations.speechOutputEnabled)
  );
}

/**
 * Mic / speaker toggles plus dictation status, rendered inside the field's
 * flex row (the status wraps to its own line below the field).
 */
export function FieldSpeech(props: FieldSpeechOptions) {
  const speech = useFieldSpeech(props);
  if (!speech.hasControls) return null;
  return (
    <>
      <FieldSpeechControls speech={speech} fieldId={props.fieldId} />
      <FieldSpeechStatus speech={speech} />
      {speech.reviewOpen && (
        // Remount when the candidates change so the draft resets to the new best match
        <DictationReview key={speech.candidates.join("\u0000")} speech={speech} />
      )}
    </>
  );
}

/** Profile-driven size, contrast and focus classes shared by the speech UI. */
function useSpeechControlClasses() {
  const { adaptations } = useAccessibility();
  const isExtraLarge =
    adaptations.targetSize === "extra-large" || adaptations.minTargetHeight === "56px";
  const isLarge =
    adaptations.targetSize === "large" || adaptations.minTargetHeight === "48px";
  const contrast = adaptations.highContrast ? "border-2 border-current" : "";
  const focus =
    adaptations.focusIndicator === "high-visibility"
      ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      : "";
  return {
    /** Square icon buttons (mic / speaker) */
    icon: cn(
      "shrink-0",
      isExtraLarge ? "min-h-[56px] min-w-[56px]" : isLarge ? "min-h-[48px] min-w-[48px]" : "size-9",
      contrast,
      focus
    ),
    /** Text buttons and inputs in the review panel */
    control: cn(
      isExtraLarge ? "min-h-[56px] px-5 text-lg" : isLarge ? "min-h-[48px] px-4 text-base" : "",
      contrast,
      focus
    ),
    textSize: isExtraLarge ? "text-base" : "text-sm",
  };
}

function FieldSpeechControls({ speech, fieldId }: { speech: FieldSpeechState; fieldId: string }) {
  const { t } = useLocalization();
  const buttonClass = useSpeechControlClasses().icon;

  return (
    <div data-slot="field-speech-controls" className="flex shrink-0 items-start gap-1.5">
      {speech.canDictate && (
        <Button
          type="button"
          variant={speech.isListening ? "destructive" : "outline"}
          size="icon"
          className={buttonClass}
          aria-controls={fieldId}
          aria-pressed={speech.isListening}
          aria-label={
            speech.isListening
              ? t("labels.stopDictation")
              : t("labels.dictateField", { field: speech.fieldName })
          }
          ref={speech.micRef}
          data-slot="dictate-button"
          onClick={speech.toggleDictation}
        >
          {speech.isListening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
        </Button>
      )}
      {speech.canReadAloud && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={buttonClass}
          aria-pressed={speech.isSpeaking}
          aria-label={
            speech.isSpeaking
              ? t("labels.stopReading")
              : t("labels.readFieldAloud", { field: speech.fieldName })
          }
          data-slot="read-aloud-button"
          onClick={speech.toggleReadAloud}
        >
          {speech.isSpeaking ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </Button>
      )}
    </div>
  );
}

/**
 * Visible dictation status. Interim text is visual only (aria-hidden) so
 * screen readers are not flooded; start/stop/failure are announced once
 * through the central live region instead.
 */
function FieldSpeechStatus({ speech }: { speech: FieldSpeechState }) {
  const { t } = useLocalization();
  if (speech.isListening) {
    return (
      <p
        data-slot="dictation-status"
        aria-hidden="true"
        className="basis-full text-xs text-muted-foreground italic"
      >
        {t("announcements.listening")}
        {speech.interimTranscript ? ` “${speech.interimTranscript}”` : ""}
        {speech.tip && <span className="block not-italic">{speech.tip}</span>}
      </p>
    );
  }
  if (speech.dictationError && speech.canDictate) {
    return (
      <p data-slot="dictation-status" className="basis-full text-xs text-muted-foreground">
        {t("errors.dictationFailed")}
      </p>
    );
  }
  return null;
}

/**
 * Review panel shown after dictation. The best match is pre-filled in an
 * editable box; other matches from the engine can be picked with one tap.
 * Nothing reaches the field until the user presses Insert (or Enter).
 */
function DictationReview({ speech }: { speech: FieldSpeechState }) {
  const { t } = useLocalization();
  const classes = useSpeechControlClasses();
  const { candidates } = speech;
  const [draft, setDraft] = React.useState(candidates[0] ?? "");
  // Captured when the panel opens: confirming will overwrite existing text.
  const [replaces] = React.useState(() => speech.fieldHasText());
  const draftRef = React.useRef<HTMLInputElement>(null);
  const baseId = React.useId();
  const headingId = `${baseId}-heard`;
  const hintId = `${baseId}-hint`;
  const altId = `${baseId}-alts`;

  // Move focus into the review so keyboard and screen-reader users land on it.
  React.useEffect(() => {
    draftRef.current?.focus();
    draftRef.current?.select();
  }, []);

  const insert = () => {
    if (draft.trim()) speech.insertReviewed(draft);
  };

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-slot="dictation-review"
      data-escape-scope=""
      className={cn("basis-full flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3", classes.textSize)}
    >
      <p id={headingId} className="font-semibold text-foreground">
        {t("labels.dictationHeard")}
      </p>
      <p id={hintId} className="text-xs text-muted-foreground">
        {t("labels.dictationEditHint")}
        {replaces && (
          <span data-slot="dictation-replace-hint" className="block mt-1 font-medium text-foreground">
            {t("labels.dictationReplaceHint")}
          </span>
        )}
        {speech.tip && <span className="block mt-1">{speech.tip}</span>}
      </p>
      <Input
        ref={draftRef}
        value={draft}
        aria-labelledby={headingId}
        aria-describedby={hintId}
        data-slot="dictation-draft"
        className={classes.control}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            insert();
          } else if (e.key === "Escape") {
            // Keep Escape from also closing a surrounding dialog
            e.preventDefault();
            e.stopPropagation();
            speech.discardReview();
          }
        }}
      />

      {candidates.length > 1 && (
        <div role="group" aria-labelledby={altId} className="flex flex-col gap-1.5">
          <p id={altId} className="text-xs text-muted-foreground">
            {t("labels.dictationAlternatives")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => (
              <Button
                key={candidate}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={draft === candidate}
                data-slot="dictation-alternative"
                className={classes.control}
                onClick={() => {
                  setDraft(candidate);
                  draftRef.current?.focus();
                }}
              >
                {candidate}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className={classes.control}
          disabled={!draft.trim()}
          data-slot="dictation-insert"
          onClick={insert}
        >
          {t(replaces ? "labels.replaceDictation" : "labels.insertDictation")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={classes.control}
          data-slot="dictation-retry"
          onClick={speech.retryDictation}
        >
          {t("labels.retryDictation")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classes.control}
          data-slot="dictation-discard"
          onClick={speech.discardReview}
        >
          {t("labels.discardDictation")}
        </Button>
      </div>
    </div>
  );
}

/** Combines a forwarded ref with an internal ref. */
export function useMergedRef<T>(
  forwarded: React.ForwardedRef<T>,
  internal: React.MutableRefObject<T | null>
) {
  return React.useCallback(
    (node: T | null) => {
      internal.current = node;
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [forwarded, internal]
  );
}
