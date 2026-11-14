import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/utils";
import type { VariantProps } from "class-variance-authority";

export const buttonBaseVariants = buttonVariants;

export interface TederashButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Explicit confirmation required when clicking destructive actions */
  confirmDestructivePrompt?: string;
}

export type AccessibleButtonProps = TederashButtonProps;

export const TederashButton = React.forwardRef<
  HTMLButtonElement,
  TederashButtonProps
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

    // Scaled touch sizing when motor preferences are active; standard 40px compliance touch target otherwise
    const isExtraLarge =
      adaptations.targetSize === "extra-large" ||
      adaptations.minTargetHeight === "56px";
    const isLarge =
      adaptations.targetSize === "large" ||
      adaptations.minTargetHeight === "48px";

    const adaptiveSizeClasses = isExtraLarge
      ? "min-h-[56px] px-8 text-lg rounded-lg gap-3"
      : isLarge
      ? "min-h-[48px] px-6 text-base rounded-md gap-2.5"
      : "min-h-[40px]";

    const contrastClasses = adaptations.highContrast
      ? "border-2 border-current font-bold"
      : "";

    const focusClasses =
      adaptations.focusIndicator === "high-visibility"
        ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        : "";

    const motionClasses = adaptations.reduceMotion
      ? "transition-none active:scale-100"
      : "";

    return (
      <Button
        ref={ref}
        asChild={asChild}
        variant={variant}
        data-slot="tederash-button"
        data-target-size={adaptations.targetSize}
        data-high-contrast={adaptations.highContrast}
        className={cn(
          adaptiveSizeClasses,
          contrastClasses,
          focusClasses,
          motionClasses,
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

TederashButton.displayName = "TederashButton";

export const AccessibleButton = TederashButton;
export { Button };
