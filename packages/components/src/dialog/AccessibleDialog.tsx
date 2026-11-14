import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { X } from "lucide-react";

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

export const TederashDialog: React.FC<TederashDialogProps> = ({
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
}) => {
  const { adaptations } = useAccessibility();
  const { t } = useLocalization();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);
  const originalOverflowRef = React.useRef<string>("");
  const wasOpenRef = React.useRef(false);

  // Keep callbacks and refs in stable useRef to prevent re-triggering effects on parent re-renders
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const closeOnEscapeRef = React.useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;
  const initialFocusRefStable = React.useRef(initialFocusRef);
  initialFocusRefStable.current = initialFocusRef;
  const restoreFocusRefStable = React.useRef(restoreFocusRef);
  restoreFocusRefStable.current = restoreFocusRef;

  const baseId = React.useId();
  const titleId = `dialog-title-${baseId}`;
  const descId = `dialog-desc-${baseId}`;

  // Focus trap & restoration
  React.useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        if (typeof document !== "undefined") {
          document.body.style.overflow = originalOverflowRef.current;
        }
        if (restoreFocusRefStable.current?.current) {
          restoreFocusRefStable.current.current.focus();
        } else if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === "function"
        ) {
          try {
            previousActiveElementRef.current.focus();
          } catch {
            // Ignore if unmounted or focus fails
          }
        }
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;
    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      originalOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    // Move initial focus
    const focusTimer = setTimeout(() => {
      if (initialFocusRefStable.current?.current) {
        initialFocusRefStable.current.current.focus();
      } else if (dialogRef.current) {
        const focusableSelector =
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 10);

    return () => clearTimeout(focusTimer);
  }, [open]);

  // Keyboard navigation: Escape key & Tab trapping
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Clean up body overflow on unmount
  React.useEffect(() => {
    return () => {
      if (wasOpenRef.current && typeof document !== "undefined") {
        document.body.style.overflow = originalOverflowRef.current;
        if (restoreFocusRefStable.current?.current) {
          restoreFocusRefStable.current.current.focus();
        } else if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === "function"
        ) {
          try {
            previousActiveElementRef.current.focus();
          } catch {
            // Ignore if unmounted or focus fails
          }
        }
        wasOpenRef.current = false;
      }
    };
  }, [open]);

  if (!open) return null;

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
    ? "transition-none animate-none"
    : "transition-all duration-200";

  return (
    <div
      role="presentation"
      data-slot="accessible-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs",
        adaptations.highContrast ? "bg-black/80" : "bg-black/60",
        motionClasses
      )}
      onClick={() => {
        if (closeOnBackdropClick) {
          onOpenChangeRef.current(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        tabIndex={-1}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        data-slot="accessible-dialog"
        data-target-size={adaptations.targetSize}
        data-high-contrast={String(adaptations.highContrast)}
        className={cn(
          "w-full rounded-lg relative outline-none bg-background text-foreground",
          sizeClasses,
          contrastClasses,
          motionClasses,
          destructive && "border-destructive ring-1 ring-destructive/30",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-slot="dialog-header"
          className="flex flex-col gap-1.5 text-left pb-4"
        >
          <div className="flex items-center justify-between">
            <h2
              id={titleId}
              data-slot="dialog-title"
              className={cn(
                "text-lg font-semibold leading-none tracking-tight",
                isExtraLarge && "text-xl font-bold",
                destructive && "text-destructive"
              )}
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                aria-label={closeButtonAriaLabel ?? t("labels.closeDialog")}
                onClick={() => onOpenChangeRef.current(false)}
                className={cn(
                  "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 inline-flex items-center justify-center text-muted-foreground hover:text-foreground",
                  closeButtonSize,
                  focusClasses,
                  adaptations.highContrast && "border border-current font-bold"
                )}
              >
                <X className="size-4 shrink-0" aria-hidden="true" />
              </button>
            )}
          </div>

          {description && (
            <p
              id={descId}
              data-slot="dialog-description"
              className={cn(
                "text-sm text-muted-foreground leading-relaxed mt-1",
                isExtraLarge && "text-base font-medium",
                adaptations.showInstructions && "font-medium text-foreground"
              )}
            >
              {description}
            </p>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};

TederashDialog.displayName = "TederashDialog";

export const AccessibleDialog = TederashDialog;
