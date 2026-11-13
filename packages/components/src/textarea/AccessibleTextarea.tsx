import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TederashTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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
  /** Maximum character limit (also displays character counter) */
  maxLength?: number;
  /** Explicitly toggle character counter display (defaults to true if maxLength is set) */
  showCharacterCount?: boolean;
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
      className = "",
      required = false,
      disabled = false,
      value,
      defaultValue,
      onChange,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = explicitId || generatedId;
    const descriptionId = `${textareaId}-desc`;
    const errorId = `${textareaId}-error`;
    const counterId = `${textareaId}-counter`;

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

    // Adaptive sizing
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const sizeClasses = isExtraLarge
      ? "min-h-[120px] p-4 text-lg rounded-lg"
      : isLarge
      ? "min-h-[108px] p-3.5 text-base rounded-md"
      : "min-h-[100px] p-3 text-sm rounded-md";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-foreground dark:border-white font-medium bg-background text-foreground"
      : "border border-input bg-background";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : adaptations.focusIndicator === "enhanced"
        ? "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        : "focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none";

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
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
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
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

        <textarea
          ref={ref}
          id={textareaId}
          data-slot="accessible-textarea"
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
          rows={rows}
          className={cn(
            "w-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            sizeClasses,
            contrastClasses,
            focusClasses,
            error && "border-destructive ring-1 ring-destructive",
            className
          )}
          {...props}
        />

        {/* Footer containing error message and character counter */}
        <div className="flex items-center justify-between text-xs gap-2">
          {error ? (
            <p
              id={errorId}
              role="alert"
              className={cn(
                "text-destructive font-medium",
                isExtraLarge ? "text-base font-bold" : "text-xs"
              )}
            >
              {error}
            </p>
          ) : (
            <span />
          )}

          {shouldShowCounter && maxLength !== undefined && (
            <span
              id={counterId}
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "text-muted-foreground ml-auto font-mono select-none",
                isExtraLarge ? "text-sm" : "text-xs",
                currentCount >= maxLength && "text-destructive font-bold"
              )}
            >
              {t("labels.charactersUsed", { count: currentCount, max: maxLength })}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TederashTextarea.displayName = "TederashTextarea";

export const AccessibleTextarea = TederashTextarea;
