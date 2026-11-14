import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { Label } from "../ui/label";
import { ChevronDown, Check } from "lucide-react";

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
  /** HTML form name */
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

    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    // Merge internal trigger ref with forwarded ref
    React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

    const selectedIndex = options.findIndex((o) => o.value === activeValue);
    const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return;

      const handlePointerDown = (e: MouseEvent | PointerEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
      };
    }, [isOpen]);

    const selectOptionByIndex = (index: number) => {
      const opt = options[index];
      if (!opt || opt.disabled) return;
      if (!isControlled) {
        setInternalValue(opt.value);
      }
      onChange?.(opt.value);
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        } else {
          setFocusedIndex((prev) => (prev + 1) % options.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
        } else {
          setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
          selectOptionByIndex(focusedIndex);
        } else {
          setIsOpen(true);
          setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }
      } else if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      } else if (e.key === "Tab") {
        if (isOpen) {
          setIsOpen(false);
        }
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

    return (
      <div ref={containerRef} className={cn("flex flex-col gap-1.5 relative w-full", className)}>
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

        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && focusedIndex >= 0 ? `${listboxId}-opt-${focusedIndex}` : undefined
          }
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          data-slot="accessible-select-trigger"
          data-target-size={adaptations.targetSize}
          data-high-contrast={String(adaptations.highContrast)}
          onClick={() => {
            if (disabled) return;
            setIsOpen((open) => {
              const next = !open;
              if (next) {
                setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
              }
              return next;
            });
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            targetHeightClass,
            contrastClass,
            focusClass,
            error && "border-destructive ring-destructive/20 dark:ring-destructive/40",
            triggerClassName
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground", "line-clamp-1")}>
            {selectedOption ? selectedOption.label : placeholder ?? t("labels.selectAnOption")}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 opacity-50 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>

        {name && (
          <input
            type="hidden"
            name={name}
            value={activeValue}
          />
        )}

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={cn(
              "absolute top-full left-0 right-0 mt-1.5 z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto p-1",
              contrastClass,
              adaptations.highContrast && "border-2 border-foreground dark:border-white shadow-2xl",
              listboxClassName
            )}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === activeValue;
              const isFocused = idx === focusedIndex;

              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onClick={() => selectOptionByIndex(idx)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    optionHeightClass,
                    opt.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                    isFocused && "bg-accent text-accent-foreground font-medium",
                    isSelected && "bg-accent font-semibold text-accent-foreground",
                    adaptations.highContrast && isSelected && "border-l-4 border-primary font-bold"
                  )}
                >
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check aria-hidden="true" className="size-4 shrink-0 ml-2" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

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
