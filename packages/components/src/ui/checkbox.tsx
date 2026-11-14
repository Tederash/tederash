import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "./utils";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      checked = false,
      indeterminate = false,
      onCheckedChange,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onCheckedChange?.(!checked);
      props.onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === " ") {
        e.preventDefault();
        onCheckedChange?.(!checked);
      }
      props.onKeyDown?.(e);
    };

    return (
      <button
        type="button"
        role="checkbox"
        ref={ref}
        aria-checked={indeterminate ? "mixed" : checked}
        data-state={indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-sm border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          checked || indeterminate
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background",
          "inline-flex items-center justify-center",
          className
        )}
        {...props}
      >
        {children ?? (
          indeterminate ? (
            <span aria-hidden="true" className="font-bold flex items-center justify-center leading-none">—</span>
          ) : checked ? (
            <CheckIcon className="size-3.5 stroke-[3]" />
          ) : null
        )}
      </button>
    );
  }
);

Checkbox.displayName = "Checkbox";
