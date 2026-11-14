import * as React from "react";
import { useAccessibility, useTederashInteraction } from "@tederash/react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";

export interface TederashCheckboxProps {
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
  /** HTML form name (a native input is submitted when rendered inside a `<form>`) */
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

export type AccessibleCheckboxProps = TederashCheckboxProps;

export const TederashCheckbox = React.forwardRef<
  HTMLButtonElement,
  TederashCheckboxProps
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

    const handleCheckedChange = (nextChecked: boolean) => {
      if (!isControlled) {
        setInternalChecked(nextChecked);
      }
      onCheckedChange?.(nextChecked);
    };

    // Lets an assistant (the browser extension) check or uncheck through React itself.
    useTederashInteraction(inputId, {
      setChecked: (next) => handleCheckedChange(next),
      isDisabled: () => Boolean(disabled),
    });

    const activeDescription =
      adaptations.simplifiedLanguage && simplifiedDescription
        ? simplifiedDescription
        : description;

    const describedByParts: string[] = [];
    if (activeDescription) describedByParts.push(descriptionId);
    if (error) describedByParts.push(errorId);
    const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

    // Motor Target Sizing: only expand size when explicit motor assistance profile is active
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const adaptiveSizeClasses = isExtraLarge
      ? "min-h-[56px] min-w-[56px]"
      : isLarge
      ? "min-h-[48px] min-w-[48px]"
      : "";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-current font-bold"
      : "";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : "";

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex items-center gap-2.5 cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed",
            labelClassName
          )}
        >
          <Checkbox
            ref={ref}
            id={inputId}
            checked={isChecked}
            indeterminate={indeterminate}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            aria-disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-required={required}
            required={required}
            name={name}
            value={value}
            aria-describedby={ariaDescribedBy}
            data-slot="tederash-checkbox"
            data-tederash-component="checkbox"
            data-tederash-id={inputId}
            data-tederash-label={label}
            data-tederash-checked={String(Boolean(isChecked))}
            data-tederash-required={required ? "true" : undefined}
            data-tederash-error={error || undefined}
            data-target-size={adaptations.targetSize}
            data-high-contrast={String(adaptations.highContrast)}
            className={cn(
              adaptiveSizeClasses,
              contrastClasses,
              focusClasses,
              error && "border-destructive ring-destructive/20",
              checkboxClassName
            )}
          />

          <span
            className={cn(
              "text-sm font-medium leading-none select-none text-foreground",
              visuallyHideLabel && "sr-only",
              isExtraLarge && "text-base font-semibold",
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

        {/* Helpful description / simplified instructions */}
        {activeDescription && (
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground ml-6 text-xs",
              isExtraLarge && "text-sm",
              adaptations.showInstructions && "font-medium text-foreground"
            )}
          >
            {activeDescription}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              "text-destructive font-medium ml-6 text-xs",
              isExtraLarge && "text-sm font-bold",
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

TederashCheckbox.displayName = "TederashCheckbox";

export const AccessibleCheckbox = TederashCheckbox;
export { Checkbox };
