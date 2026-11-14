import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../ui/dialog";

export interface TederashDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback fired when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Primary title of the dialog, used for accessible name (aria-labelledby) */
  title: string;
  /** Optional description, linked via aria-describedby */
  description?: string;
  /** Dialog content body */
  children: React.ReactNode;
  /** ARIA role: standard "dialog" or urgent/destructive "alertdialog" (default: "dialog") */
  role?: "dialog" | "alertdialog";
  /** Fallback accessible label if title is omitted */
  ariaLabel?: string;
  /** Close when Escape key is pressed (default: true) */
  closeOnEscape?: boolean;
  /** Close when backdrop overlay is clicked (default: true) */
  closeOnBackdropClick?: boolean;
  /** Element to focus when dialog opens (defaults to first focusable element) */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Element to return focus to when dialog closes (defaults to trigger activeElement) */
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  /** Show the default close button in header (default: true) */
  showCloseButton?: boolean;
  /** Accessible label for the close button (default: "Close dialog") */
  closeButtonAriaLabel?: string;
  /** Additional CSS class for dialog card */
  className?: string;
  /** Marks this dialog as an explicit destructive confirmation prompt */
  destructive?: boolean;
}

export type AccessibleDialogProps = TederashDialogProps;

export const TederashDialog = React.forwardRef<
  HTMLDivElement,
  TederashDialogProps
>(function TederashDialog(
  {
    open,
    onOpenChange,
    title,
    description,
    children,
    role = "dialog",
    ariaLabel,
    closeOnEscape = true,
    closeOnBackdropClick = true,
    initialFocusRef,
    restoreFocusRef,
    showCloseButton = true,
    closeButtonAriaLabel,
    className = "",
    destructive = false,
  },
  ref
) {
  const { adaptations } = useAccessibility();
  const { t } = useLocalization();
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Adaptive styles
  const isExtraLarge = adaptations.targetSize === "extra-large";
  const isLarge = adaptations.targetSize === "large";

  const sizeClasses = isExtraLarge
    ? "p-8 max-w-xl text-base"
    : isLarge
    ? "p-7 max-w-lg text-base"
    : "p-6 max-w-lg text-sm";

  const closeButtonSize = isExtraLarge
    ? "min-h-[48px] min-w-[48px] p-2"
    : isLarge
    ? "min-h-[44px] min-w-[44px] p-1.5"
    : "size-8 p-1";

  const contrastClasses = adaptations.highContrast
    ? "border-2 border-foreground dark:border-white font-medium bg-background text-foreground shadow-2xl"
    : "border border-border bg-background shadow-lg";

  const focusClasses =
    adaptations.focusIndicator === "high-visibility"
      ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
      : "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

  const motionClasses = adaptations.reduceMotion
    ? "transition-none animate-none data-[state=open]:animate-none data-[state=closed]:animate-none"
    : "transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

  const accessibleTitle = title || ariaLabel || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          data-slot="accessible-dialog-overlay"
          className={cn(
            adaptations.highContrast ? "bg-black/80" : "bg-black/60",
            motionClasses
          )}
          onClick={() => {
            if (closeOnBackdropClick) onOpenChange(false);
          }}
        />
        <DialogPrimitive.Content
          ref={ref}
          role={role}
          aria-modal="true"
          aria-label={title ? undefined : ariaLabel}
          // Radix links aria-describedby automatically when a Description renders;
          // explicitly clear it otherwise so no dangling reference is emitted.
          {...(description ? {} : { "aria-describedby": undefined })}
          data-slot="accessible-dialog"
          data-tederash-component="dialog"
          data-tederash-open={String(open)}
          data-target-size={adaptations.targetSize}
          data-high-contrast={String(adaptations.highContrast)}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100%-2rem)] rounded-lg outline-none bg-background text-foreground",
            sizeClasses,
            contrastClasses,
            motionClasses,
            destructive && "border-destructive ring-1 ring-destructive/30",
            className
          )}
          onEscapeKeyDown={(e) => {
            if (!closeOnEscape) {
              e.preventDefault();
              return;
            }
            // Nested widgets that use Escape themselves (e.g. the dictation
            // review panel) mark their subtree; let them handle it instead.
            const target = e.target as Element | null;
            if (target?.closest?.("[data-escape-scope]")) e.preventDefault();
          }}
          // Backdrop dismissal is handled explicitly by the overlay's onClick so
          // closeOnBackdropClick is honoured deterministically.
          onPointerDownOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            // Radix fires this before moving focus, so activeElement is still
            // the element that opened the dialog.
            previouslyFocusedRef.current =
              typeof document !== "undefined"
                ? (document.activeElement as HTMLElement | null)
                : null;
            const target = initialFocusRef?.current;
            if (target) {
              e.preventDefault();
              target.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            // Radix only restores focus to its own <Dialog.Trigger>, which this
            // controlled API does not use, so restore to the opener explicitly.
            const target =
              restoreFocusRef?.current ??
              (previouslyFocusedRef.current?.isConnected
                ? previouslyFocusedRef.current
                : null);
            previouslyFocusedRef.current = null;
            if (target) {
              e.preventDefault();
              target.focus();
            }
          }}
        >
          <div
            data-slot="dialog-header"
            className="flex flex-col gap-1.5 text-left pb-4"
          >
            <div className="flex items-center justify-between gap-4">
              <DialogTitle
                className={cn(
                  !title && "sr-only",
                  isExtraLarge && "text-xl font-bold",
                  destructive && "text-destructive"
                )}
              >
                {accessibleTitle}
              </DialogTitle>
              {showCloseButton && (
                <DialogClose
                  type="button"
                  aria-label={closeButtonAriaLabel ?? t("labels.closeDialog")}
                  className={cn(
                    "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 inline-flex items-center justify-center text-muted-foreground hover:text-foreground",
                    closeButtonSize,
                    focusClasses,
                    adaptations.highContrast && "border border-current font-bold"
                  )}
                >
                  <X className="size-4 shrink-0" aria-hidden="true" />
                </DialogClose>
              )}
            </div>

            {description && (
              <DialogDescription
                className={cn(
                  "leading-relaxed mt-1",
                  isExtraLarge && "text-base font-medium",
                  adaptations.showInstructions && "font-medium text-foreground"
                )}
              >
                {description}
              </DialogDescription>
            )}
          </div>

          <div>{children}</div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
});

TederashDialog.displayName = "TederashDialog";

export const AccessibleDialog = TederashDialog;
