import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface AccessibleDialogProps {
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

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
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

    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    // Transitioning from closed to open
    if (!wasOpenRef.current) {
      if (typeof document !== "undefined") {
        previousActiveElementRef.current = document.activeElement as HTMLElement;
        originalOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      wasOpenRef.current = true;

      focusTimer = setTimeout(() => {
        if (initialFocusRefStable.current?.current) {
          initialFocusRefStable.current.current.focus();
        } else if (dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 0);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dialogRef.current
          ) {
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
      if (focusTimer) {
        clearTimeout(focusTimer);
      }
      window.removeEventListener("keydown", handleKeyDown);

      // Restore focus on close or abrupt unmount while open
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
    };
  }, [open]);

  if (!open) return null;

  // Adaptive styles
  const isExtraLarge = adaptations.targetSize === "extra-large";
  const isLarge = adaptations.targetSize === "large";

  const sizeClasses = isExtraLarge
    ? "p-8 max-w-xl text-base"
    : isLarge
    ? "p-6 max-w-lg text-base"
    : "p-6 max-w-lg text-sm";

  const closeButtonSize = isExtraLarge
    ? "min-h-[48px] min-w-[48px] p-2 text-lg"
    : isLarge
    ? "min-h-[44px] min-w-[44px] p-1.5 text-base"
    : "min-h-[36px] min-w-[36px] p-1 text-sm";

  const contrastClasses = adaptations.highContrast
    ? "border-2 border-foreground dark:border-white font-medium bg-background text-foreground shadow-2xl"
    : "border border-border bg-background shadow-xl";

  const focusClasses =
    adaptations.focusIndicator === "high-visibility"
      ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      : adaptations.focusIndicator === "enhanced"
      ? "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      : "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

  const motionClasses = adaptations.reduceMotion
    ? "transition-none animate-none"
    : "transition-all duration-150";

  return (
    <div
      role="presentation"
      data-slot="accessible-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        adaptations.highContrast ? "bg-black/80" : "bg-black/50",
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
          "w-full rounded-lg relative outline-none",
          sizeClasses,
          contrastClasses,
          motionClasses,
          destructive && "border-destructive ring-1 ring-destructive/30",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "flex items-center justify-between pb-3",
            adaptations.highContrast ? "border-b-2 border-current" : "border-b"
          )}
        >
          <h2
            id={titleId}
            className={cn(
              "font-bold leading-none",
              isExtraLarge ? "text-xl" : "text-lg",
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
                "rounded hover:bg-muted font-bold flex items-center justify-center text-muted-foreground hover:text-foreground",
                closeButtonSize,
                focusClasses,
                adaptations.highContrast && "border border-current font-bold"
              )}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>

        {description && (
          <p
            id={descId}
            className={cn(
              "text-muted-foreground mt-2.5 leading-relaxed",
              isExtraLarge ? "text-base font-medium" : "text-sm",
              adaptations.showInstructions && "font-medium text-foreground"
            )}
          >
            {description}
          </p>
        )}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

AccessibleDialog.displayName = "AccessibleDialog";
