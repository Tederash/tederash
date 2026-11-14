import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { Input, type InputProps } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";
import { FieldSpeech, isFieldSpeechWanted, useMergedRef } from "../speech/FieldSpeech";

export interface TederashInputProps
  extends Omit<InputProps, "size"> {
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
  /**
   * Opt this field in to voice dictation. The mic button appears only when the
   * user's profile also enables `speech.speechInput`. Never offered for
   * password and other non-text types.
   */
  speechInput?: boolean;
  /**
   * Opt this field in to read-aloud (label, instructions and error). The
   * speaker button appears only when the user's profile also enables
   * `speech.speechOutput`.
   */
  speechOutput?: boolean;
}

export type AccessibleInputProps = TederashInputProps;

export const TederashInput = React.forwardRef<
  HTMLInputElement,
  TederashInputProps
>(
  (
    {
      id: explicitId,
      label,
      description,
      simplifiedDescription,
      error,
      visuallyHideLabel = false,
      className,
      required,
      disabled,
      speechInput,
      speechOutput,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = explicitId || generatedId;
    const descriptionId = `${inputId}-desc`;
    const errorId = `${inputId}-error`;

    const { adaptations } = useAccessibility();

    const activeDescription =
      adaptations.simplifiedLanguage && simplifiedDescription
        ? simplifiedDescription
        : description;

    // Build aria-describedby references
    const describedByParts: string[] = [];
    if (activeDescription) describedByParts.push(descriptionId);
    if (error) describedByParts.push(errorId);
    const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

    const fieldRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = useMergedRef(ref, fieldRef);
    const speechProps = {
      fieldRef,
      fieldId: inputId,
      label,
      description: activeDescription,
      error,
      required,
      disabled,
      readOnly: props.readOnly,
      inputType: props.type,
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
      ? "min-h-[56px] px-4 text-lg rounded-lg"
      : isLarge
      ? "min-h-[48px] px-3.5 text-base rounded-md"
      : "";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-foreground dark:border-white font-medium"
      : "";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : "";

    const field = (
      <Input
        ref={mergedRef}
        id={inputId}
        data-slot="tederash-input"
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
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
            htmlFor={inputId}
            className={cn(
              visuallyHideLabel && "sr-only",
              isExtraLarge ? "text-base font-semibold" : "text-sm",
              adaptations.highContrast && "text-foreground font-bold",
              error && "text-destructive font-semibold"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-hidden="true">
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

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              "text-destructive font-medium text-xs mt-0.5",
              isExtraLarge && "text-base font-bold",
              adaptations.highContrast && "font-bold text-destructive"
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

TederashInput.displayName = "TederashInput";

export const AccessibleInput = TederashInput;
export { Input };
