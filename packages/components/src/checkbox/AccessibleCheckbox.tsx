import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface AccessibleCheckboxProps {
  /** Unique HTML id for the checkbox button and label association */
  id?: string;
  /** Visible label text */
  label: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback fired when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether this field is required */
  required?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Explanatory description */
  description?: string;
  /** Simplified description when cognitive profile is active */
  simplifiedDescription?: string;
  /** Error message displayed and announced */
  error?: string;
  /** Hide label visually while preserving accessible name for screen readers */
  visuallyHideLabel?: boolean;
  /** HTML form name */
  name?: string;
  /** HTML form value */
  value?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional CSS class for the checkbox box */
  checkboxClassName?: string;
  /** Additional CSS class for the label text */
  labelClassName?: string;
}

export const AccessibleCheckbox = React.forwardRef<
  HTMLButtonElement,
  AccessibleCheckboxProps
>(
  (
    {
      id: explicitId,
      label,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      required = false,
      indeterminate = false,
      description,
      simplifiedDescription,
      error,
      visuallyHideLabel = false,
      name,
      value = "on",
      className = "",
      checkboxClassName = "",
      labelClassName = "",
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = explicitId || generatedId;
    const descriptionId = `${inputId}-desc`;
    const errorId = `${inputId}-error`;

    const { adaptations } = useAccessibility();

    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState<boolean>(defaultChecked);
    const isChecked = isControlled ? controlledChecked : internalChecked;

    const toggle = () => {
      if (disabled) return;
      const nextChecked = !isChecked;
      if (!isControlled) {
        setInternalChecked(nextChecked);
      }
      onCheckedChange?.(nextChecked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " && !disabled) {
        e.preventDefault();
        toggle();
      }
    };

    const activeDescription =
      adaptations.simplifiedLanguage && simplifiedDescription
        ? simplifiedDescription
        : description;

    const describedByParts: string[] = [];
    if (activeDescription) describedByParts.push(descriptionId);
    if (error) describedByParts.push(errorId);
    const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

    // Motor Target Sizing (40px / 48px / 56px touch target container)
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const targetSizeClass = isExtraLarge
      ? "min-h-[56px] min-w-[56px]"
      : isLarge
      ? "min-h-[48px] min-w-[48px]"
      : "min-h-[40px] min-w-[40px]";

    const boxSizeClass = isExtraLarge
      ? "h-6 w-6 text-base"
      : isLarge
      ? "h-5 w-5 text-sm"
      : "h-4 w-4 text-xs";

    // Visual Contrast
    const contrastClass = adaptations.highContrast
      ? "border-2 border-current font-bold"
      : "border border-input";

    // Focus indicator
    const focusClass =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : adaptations.focusIndicator === "enhanced"
        ? "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        : "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex items-center gap-3 cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed",
            labelClassName
          )}
        >
          <button
            ref={ref}
            type="button"
            id={inputId}
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : isChecked}
            aria-disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-required={required}
            aria-describedby={ariaDescribedBy}
            disabled={disabled}
            data-slot="accessible-checkbox"
            data-target-size={adaptations.targetSize}
            data-high-contrast={String(adaptations.highContrast)}
            onClick={toggle}
            onKeyDown={handleKeyDown}
            className={cn(
              "inline-flex items-center justify-center rounded transition-colors bg-background",
              targetSizeClass,
              focusClass,
              contrastClass,
              isChecked ? "bg-primary text-primary-foreground" : "bg-background",
              error && "border-destructive ring-destructive/30",
              checkboxClassName
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center font-bold",
                boxSizeClass
              )}
              aria-hidden="true"
            >
              {indeterminate ? "—" : isChecked ? "✓" : ""}
            </span>
          </button>

          <span
            className={cn(
              "font-medium leading-none",
              visuallyHideLabel && "sr-only",
              isExtraLarge ? "text-base" : "text-sm",
              adaptations.highContrast && "font-bold text-foreground",
              error && "text-destructive font-semibold"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </span>
        </label>

        {name && (
          <input
            type="hidden"
            name={name}
            value={isChecked ? value : ""}
          />
        )}

        {activeDescription && (
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground ml-1",
              isExtraLarge ? "text-sm" : "text-xs",
              adaptations.showInstructions && "font-medium text-foreground"
            )}
          >
            {activeDescription}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              "text-destructive font-medium ml-1",
              isExtraLarge ? "text-sm font-bold" : "text-xs"
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleCheckbox.displayName = "AccessibleCheckbox";
