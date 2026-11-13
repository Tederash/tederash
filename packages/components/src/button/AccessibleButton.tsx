import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const buttonBaseVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all select-none disabled:pointer-events-none disabled:opacity-50 outline-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-destructive text-white hover:opacity-90 active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonBaseVariants> {
  asChild?: boolean;
  /** Explicit confirmation required when clicking destructive actions */
  confirmDestructivePrompt?: string;
}export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      className,
      variant = "primary",
      asChild = false,
      onClick,
      confirmDestructivePrompt,
      children,
      ...props
    },
    ref
  ) => {
    const { adaptations, announce } = useAccessibility();
    const { t } = useLocalization();
    const Comp = asChild ? Slot : "button";

    const isDestructive = variant === "destructive";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (
        isDestructive &&
        adaptations.confirmationBeforeDestructiveActions &&
        typeof window !== "undefined"
      ) {
        const confirmed = window.confirm(
          confirmDestructivePrompt ?? t("labels.confirmDestructivePrompt")
        );
        if (!confirmed) {
          e.preventDefault();
          announce({
            message: t("labels.actionCancelled"),
            priority: "polite",
            category: "info",
          });
          return;
        }
      }

      onClick?.(e);
    };

    // Adaptive classes based on runtime preferences
    const sizeClasses =
      adaptations.targetSize === "extra-large"
        ? "min-h-[56px] px-8 py-3.5 text-lg rounded-lg gap-3"
        : adaptations.targetSize === "large"
        ? "min-h-[48px] px-6 py-2.5 text-base rounded-md gap-2.5"
        : "min-h-[40px] px-4 py-2 text-sm rounded-md gap-2";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-current font-bold"
      : "";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : adaptations.focusIndicator === "enhanced"
        ? "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        : "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

    const motionClasses = adaptations.reduceMotion ? "transition-none active:scale-100" : "";

    return (
      <Comp
        ref={ref}
        data-slot="accessible-button"
        data-target-size={adaptations.targetSize}
        data-high-contrast={adaptations.highContrast}
        className={cn(
          buttonBaseVariants({ variant }),
          sizeClasses,
          contrastClasses,
          focusClasses,
          motionClasses,
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";
