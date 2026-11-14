import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { AlertTriangle } from "lucide-react";

export interface TederashFormProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Array of active form error messages to summarize at the top of the form */
  errors?: string[];
  /** Announcement text on submission success */
  successAnnouncement?: string;
}

export type AccessibleFormProps = TederashFormProps;

export const TederashForm = React.forwardRef<
  HTMLFormElement,
  TederashFormProps
>(
  (
    {
      children,
      className,
      errors = [],
      successAnnouncement,
      onSubmit,
      ...props
    },
    ref
  ) => {
    const { adaptations, announce } = useAccessibility();
    const { t } = useLocalization();

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
      if (errors.length > 0) {
        announce({
          message: t("errors.formErrors", { count: errors.length }),
          priority: "assertive",
          category: "error",
        });
      } else if (successAnnouncement) {
        announce({
          message: successAnnouncement,
          priority: "polite",
          category: "success",
        });
      }

      onSubmit?.(e as any);
    };

    return (
      <form
        ref={ref}
        data-slot="tederash-form"
        data-guided={adaptations.guidedInteraction}
        noValidate
        onSubmit={handleSubmit}
        className={cn(
          "w-full flex flex-col gap-6",
          adaptations.guidedInteraction && "p-6 rounded-xl border-2 border-primary/20 bg-card shadow-sm",
          className
        )}
        {...props}
      >
        {/* Error summary banner for WCAG 3.3.1 / 3.3.3 error identification */}
        {errors.length > 0 && (
          <Alert
            variant="destructive"
            tabIndex={-1}
            aria-labelledby="form-error-heading"
            className={cn(
              "flex flex-col gap-2 border-2",
              adaptations.highContrast && "bg-black text-white border-4 border-destructive font-bold"
            )}
          >
            <AlertTitle id="form-error-heading" className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              <span>{t("errors.summaryHeading")}</span>
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm font-medium">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {children}
      </form>
    );
  }
);

TederashForm.displayName = "TederashForm";

export const AccessibleForm = TederashForm;
