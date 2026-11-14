import * as React from "react";
import { matchTederashOption, useAccessibility, useTederashInteraction } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { Label } from "../ui/label";
import { ChevronDown, Check } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";

export interface TederashSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export type AccessibleSelectOption = TederashSelectOption;

export interface TederashSelectProps {
  /** Unique HTML id for the select element and label linkage */
  id?: string;
  /** Visible label for accessible name */
  label: string;
  /** Array of available options */
  options: TederashSelectOption[];
  /** Controlled selected value */
  value?: string;
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback fired when selection changes */
  onChange?: (value: string) => void;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether selection is required */
  required?: boolean;
  /** Explanatory description */
  description?: string;
  /** Simplified instructions when cognitive profile is active */
  simplifiedDescription?: string;
  /** Error message displayed and announced */
  error?: string;
  /** Hide label visually while preserving accessible name for screen readers */
  visuallyHideLabel?: boolean;
  /** HTML form name (a native select is submitted when rendered inside a `<form>`) */
  name?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Additional CSS class for the combobox trigger button */
  triggerClassName?: string;
  /** Additional CSS class for the dropdown listbox */
  listboxClassName?: string;
}

export type AccessibleSelectProps = TederashSelectProps;

export const TederashSelect = React.forwardRef<
  HTMLButtonElement,
  TederashSelectProps
>(
  (
    {
      id: explicitId,
      label,
      options,
      value: controlledValue,
      defaultValue = "",
      onChange,
      placeholder,
      disabled = false,
      required = false,
      description,
      simplifiedDescription,
      error,
      visuallyHideLabel = false,
      name,
      className = "",
      triggerClassName = "",
      listboxClassName = "",
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = explicitId || generatedId;
    const listboxId = `${selectId}-listbox`;
    const descriptionId = `${selectId}-desc`;
    const errorId = `${selectId}-error`;

    const { adaptations } = useAccessibility();
    const { t } = useLocalization();

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue);
    const activeValue = isControlled ? controlledValue : internalValue;

    const handleValueChange = (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    };

    // Lets an assistant (the browser extension) choose an option through React itself.
    useTederashInteraction(selectId, {
      choose: (wanted) => {
        const match = matchTederashOption(options, wanted);
        if (!match) return false;
        handleValueChange(match.value);
        return true;
      },
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

    // Motor Target Sizing
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const targetHeightClass = isExtraLarge
      ? "min-h-[56px] text-lg px-4"
      : isLarge
      ? "min-h-[48px] text-base px-3.5"
      : "";

    const optionHeightClass = isExtraLarge
      ? "min-h-[56px] text-lg px-4 py-3"
      : isLarge
      ? "min-h-[48px] text-base px-3.5 py-2.5"
      : "";

    // High Contrast
    const contrastClass = adaptations.highContrast
      ? "border-2 border-foreground dark:border-white font-medium"
      : "";

    // Focus indicator
    const focusClass =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
        : "";

    const motionClass = adaptations.reduceMotion
      ? "transition-none [&>svg]:transition-none"
      : "";

    return (
      <div className={cn("flex flex-col gap-1.5 relative w-full", className)}>
        <Label
          htmlFor={selectId}
          className={cn(
            visuallyHideLabel && "sr-only",
            isExtraLarge ? "text-base" : "text-sm",
            adaptations.highContrast && "font-bold",
            error && "text-destructive"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
        </Label>

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

        <SelectPrimitive.Root
          value={activeValue}
          onValueChange={handleValueChange}
          disabled={disabled}
          required={required}
          name={name}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            aria-required={required}
            aria-describedby={ariaDescribedBy}
            data-slot="accessible-select-trigger"
            data-tederash-component="select"
            data-tederash-id={selectId}
            data-tederash-label={label}
            data-tederash-value={activeValue}
            data-tederash-required={required ? "true" : undefined}
            data-tederash-error={error || undefined}
            data-target-size={adaptations.targetSize}
            data-high-contrast={String(adaptations.highContrast)}
            className={cn(
              "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
              "data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1 [&>svg]:transition-transform [&>svg]:duration-200 [&[data-state=open]>svg]:rotate-180",
              targetHeightClass,
              contrastClass,
              focusClass,
              motionClass,
              error && "border-destructive ring-destructive/20 dark:ring-destructive/40",
              triggerClassName
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder ?? t("labels.selectAnOption")} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              id={listboxId}
              position="popper"
              sideOffset={6}
              aria-label={label}
              data-slot="accessible-select-content"
              className={cn(
                "relative z-50 max-h-60 min-w-[8rem] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
                contrastClass,
                adaptations.highContrast && "border-2 border-foreground dark:border-white shadow-2xl",
                listboxClassName
              )}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    data-slot="accessible-select-option"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:font-medium",
                      "data-[state=checked]:font-semibold",
                      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none",
                      adaptations.highContrast && "data-[state=checked]:border-l-4 data-[state=checked]:border-primary data-[state=checked]:font-bold",
                      optionHeightClass
                    )}
                  >
                    <div className="flex flex-col">
                      <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                      {opt.description && (
                        <span className="text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    <SelectPrimitive.ItemIndicator>
                      <Check aria-hidden="true" className="size-4 shrink-0 ml-2" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

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

TederashSelect.displayName = "TederashSelect";

export const AccessibleSelect = TederashSelect;
