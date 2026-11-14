import * as React from "react";
import { useAccessibility, useTederashInteraction } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { Textarea, type TextareaProps } from "../ui/textarea";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";
import { FieldSpeech, isFieldSpeechWanted, setFieldValue, useMergedRef } from "../speech/FieldSpeech";

export interface TederashTextareaProps
  extends Omit<TextareaProps, "size"> {
  /** Visible label text for accessible name */
  label?: string;
  /** Explanatory description */
  description?: string;
  /** Simplified instructions shown when cognitive/simplified profile is active */
  simplifiedDescription?: string;
  /** Error message displayed and announced */
  error?: string;
  /** Hide label visually while preserving accessible name for screen readers */
  visuallyHideLabel?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Whether to show a live character counter */
  showCharacterCount?: boolean;
  /**
   * Opt this field in to voice dictation. The mic button appears only when the
   * user's profile also enables `speech.speechInput`.
   */
  speechInput?: boolean;
  /**
   * Opt this field in to read-aloud (label, instructions and error). The
   * speaker button appears only when the user's profile also enables
   * `speech.speechOutput`.
   */
  speechOutput?: boolean;
}

export type AccessibleTextareaProps = TederashTextareaProps;

export const TederashTextarea = React.forwardRef<
  HTMLTextAreaElement,
  TederashTextareaProps
>(
  (
    {
      id: explicitId,
      label,
      description,
      simplifiedDescription,
      error,
      visuallyHideLabel = false,
      maxLength,
      showCharacterCount,
      className,
      required,
      disabled,
      value,
      defaultValue,
      onChange,
      speechInput,
      speechOutput,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = explicitId || generatedId;
    const descriptionId = `${textareaId}-desc`;
    const counterId = `${textareaId}-counter`;
    const errorId = `${textareaId}-error`;

    const { adaptations } = useAccessibility();
    const { t } = useLocalization();

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(() => {
      if (typeof defaultValue === "string") return defaultValue;
      if (Array.isArray(defaultValue)) return defaultValue.join("");
      return "";
    });

    const currentValue = isControlled
      ? typeof value === "string"
        ? value
        : Array.isArray(value)
        ? value.join("")
        : ""
      : uncontrolledValue;

    const currentCount = currentValue.length;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setUncontrolledValue(e.target.value);
      }
      onChange?.(e);
    };

    const activeDescription =
      adaptations.simplifiedLanguage && simplifiedDescription
        ? simplifiedDescription
        : description;

    const shouldShowCounter = showCharacterCount ?? (maxLength !== undefined);

    // Build aria-describedby references
    const describedByParts: string[] = [];
    if (activeDescription) describedByParts.push(descriptionId);
    if (shouldShowCounter && maxLength !== undefined) describedByParts.push(counterId);
    if (error) describedByParts.push(errorId);
    const ariaDescribedBy =
      describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

    const fieldRef = React.useRef<HTMLTextAreaElement | null>(null);
    const mergedRef = useMergedRef(ref, fieldRef);

    // Lets an assistant (the browser extension) fill this field through React itself.
    useTederashInteraction(textareaId, {
      fill: (value) => {
        const el = fieldRef.current;
        if (el && !(el instanceof HTMLInputElement && el.type === "password")) setFieldValue(el, value);
      },
      isDisabled: () => Boolean(fieldRef.current?.disabled || fieldRef.current?.readOnly),
    });
    const speechProps = {
      fieldRef,
      fieldId: textareaId,
      label,
      description: activeDescription,
      error,
      required,
      disabled,
      readOnly: props.readOnly,
      speechInput,
      speechOutput,
    };
    const speechWanted = isFieldSpeechWanted(adaptations, speechInput, speechOutput);

    // Adaptive sizing
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const adaptiveSizeClasses = isExtraLarge
      ? "min-h-[120px] p-4 text-lg rounded-lg"
      : isLarge
      ? "min-h-[108px] p-3.5 text-base rounded-md"
      : "";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-foreground dark:border-white font-medium"
      : "";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : "";

    const field = (
        <Textarea
          ref={mergedRef}
          id={textareaId}
          data-slot="accessible-textarea"
          data-tederash-component="textarea"
          data-tederash-id={textareaId}
          data-tederash-label={label}
          data-tederash-required={required ? "true" : undefined}
          data-tederash-error={error || undefined}
          data-target-size={adaptations.targetSize}
          data-high-contrast={String(adaptations.highContrast)}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            adaptiveSizeClasses,
            contrastClasses,
            focusClasses,
            "flex-1 min-w-0",
            className
          )}
          {...props}
        />
    );

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <Label
            htmlFor={textareaId}
            className={cn(
              "font-semibold leading-none select-none text-foreground flex items-center gap-1",
              visuallyHideLabel && "sr-only",
              isExtraLarge ? "text-base" : "text-sm",
              adaptations.highContrast && "font-bold",
              error && "text-destructive font-semibold"
            )}
          >
            <span>{label}</span>
            {required && (
              <span className="text-destructive ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </Label>
        )}

        {/* Helpful description / simplified instructions */}
        {activeDescription && (
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground",
              isExtraLarge ? "text-sm" : "text-xs",
              adaptations.showInstructions && "font-medium text-foreground"
            )}
          >
            {activeDescription}
          </p>
        )}

        {/* Stable row: the field never remounts when speech is toggled */}
        <div data-slot="field-row" className="flex flex-wrap items-start gap-x-2 gap-y-1">
          {field}
          {speechWanted && <FieldSpeech {...speechProps} />}
        </div>

        <div className="flex items-center justify-between text-xs gap-2">
          {/* Error message */}
          {error ? (
            <p
              id={errorId}
              role="alert"
              className={cn(
                "text-destructive font-medium",
                isExtraLarge ? "text-sm font-bold" : "text-xs",
                adaptations.highContrast && "font-bold text-destructive"
              )}
            >
              {error}
            </p>
          ) : (
            <span />
          )}

          {/* Accessible Character counter with live region */}
          {shouldShowCounter && maxLength !== undefined && (
            <div
              id={counterId}
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "text-muted-foreground font-mono select-none text-xs ml-auto",
                isExtraLarge && "text-sm font-semibold",
                currentCount >= maxLength && "text-destructive font-bold",
                adaptations.highContrast && "font-bold text-foreground"
              )}
            >
              {t("labels.charactersUsed", { count: currentCount, max: maxLength })}
            </div>
          )}
        </div>
      </div>
    );
  }
);

TederashTextarea.displayName = "TederashTextarea";

export const AccessibleTextarea = TederashTextarea;
export { Textarea };
