import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "./utils";

export interface CheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    "checked" | "defaultChecked" | "onCheckedChange"
  > {
  /** Controlled checked state (omit for uncontrolled usage with `defaultChecked`) */
  checked?: boolean;
  /** Initial checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Renders the mixed state (`aria-checked="mixed"`); takes precedence over `checked` */
  indeterminate?: boolean;
  /** Fired with the next boolean state when the user toggles the checkbox */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Checkbox built on `@radix-ui/react-checkbox`. Radix provides the
 * WAI-ARIA checkbox semantics (role, aria-checked incl. "mixed", Space to
 * toggle via native button activation, Enter suppressed) and a native
 * bubble input for form submission when rendered inside a `<form>`.
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    { className, checked, indeterminate = false, onCheckedChange, ...props },
    ref
  ) => {
    const radixChecked: CheckboxPrimitive.CheckedState | undefined =
      indeterminate ? "indeterminate" : checked;

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={radixChecked}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
        className={cn(
          "peer border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-sm border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
          "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
          "inline-flex items-center justify-center",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current"
        >
          {indeterminate ? (
            <MinusIcon className="size-3.5 stroke-[3]" aria-hidden="true" />
          ) : (
            <CheckIcon className="size-3.5 stroke-[3]" aria-hidden="true" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);

Checkbox.displayName = "Checkbox";
