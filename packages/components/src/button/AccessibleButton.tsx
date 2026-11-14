import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "../ui/utils";
import { TederashDialog } from "../dialog/AccessibleDialog";
import type { VariantProps } from "class-variance-authority";

export const buttonBaseVariants = buttonVariants;

export interface TederashButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Message shown in the confirmation dialog when a destructive button is
   * clicked while `interaction.confirmationBeforeDestructiveActions` is active.
   */
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
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    // Holds the original click event while the confirmation dialog is open.
    const [pendingEvent, setPendingEvent] =
      React.useState<React.MouseEvent<HTMLButtonElement> | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDestructive && adaptations.confirmationBeforeDestructiveActions) {
        // Block the native action (e.g. form submission) until the user confirms.
        e.preventDefault();
        setPendingEvent(e);
        return;
      }

      onClick?.(e);
    };

    const handleCancel = () => {
      setPendingEvent(null);
      announce({
        message: t("labels.actionCancelled"),
        priority: "polite",
        category: "info",
      });
    };

    const handleConfirm = () => {
      const event = pendingEvent;
      setPendingEvent(null);
      if (!event) return;

      onClick?.(event);

      // Re-trigger the native submit that was blocked while awaiting confirmation.
      const button = buttonRef.current;
      if (button && button.type === "submit" && button.form) {
        button.form.requestSubmit(button);
      }
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
      <>
      <Button
        ref={setRefs}
        asChild={asChild}
        variant={variant}
        data-slot="tederash-button"
        data-tederash-component="button"
        data-tederash-id={props.id || undefined}
        data-tederash-variant={variant}
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
      {isDestructive && (
        <TederashDialog
          open={pendingEvent !== null}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
          role="alertdialog"
          destructive
          title={t("announcements.confirmationRequired")}
          description={
            confirmDestructivePrompt ?? t("labels.confirmDestructivePrompt")
          }
          initialFocusRef={cancelRef}
          restoreFocusRef={buttonRef}
          showCloseButton={false}
        >
          <div
            data-slot="confirm-actions"
            className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              className={cn(adaptiveSizeClasses, contrastClasses, focusClasses)}
              onClick={handleCancel}
            >
              {t("labels.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={cn(adaptiveSizeClasses, contrastClasses, focusClasses)}
              onClick={handleConfirm}
            >
              {t("labels.confirm")}
            </Button>
          </div>
        </TederashDialog>
      )}
      </>
    );
  }
);

TederashButton.displayName = "TederashButton";

export const AccessibleButton = TederashButton;
export { Button };
