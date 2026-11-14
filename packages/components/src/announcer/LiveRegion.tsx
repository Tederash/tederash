import * as React from "react";
import { Announcement } from "@tederash/core";
import { useAccessibility } from "@tederash/react";
import { cn } from "../ui/utils";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export interface TederashLiveRegionProps {
  /** Include visual toast/banner display alongside screen reader live region */
  showVisualBanner?: boolean;
  className?: string;
}

export type LiveRegionProps = TederashLiveRegionProps;

/**
 * Screen-reader-compatible live region component.
 * Maintains dedicated polite and assertive live regions to announce interface state changes.
 */
export const TederashLiveRegion = React.forwardRef<
  HTMLDivElement,
  TederashLiveRegionProps
>(function TederashLiveRegion({ showVisualBanner = false, className = "" }, ref) {
  const { runtime, adaptations } = useAccessibility();
  const [politeMessage, setPoliteMessage] = React.useState<string>("");
  const [assertiveMessage, setAssertiveMessage] = React.useState<string>("");
  const [activeBanner, setActiveBanner] = React.useState<Announcement | null>(null);

  React.useEffect(() => {
    return runtime.onAnnounce((announcement) => {
      if (announcement.priority === "assertive") {
        setAssertiveMessage(announcement.message);
      } else {
        setPoliteMessage(announcement.message);
      }

      if (showVisualBanner) {
        setActiveBanner(announcement);
        const timer = setTimeout(() => {
          setActiveBanner((current) =>
            current?.id === announcement.id ? null : current
          );
        }, 4000);
        return () => clearTimeout(timer);
      }
    });
  }, [runtime, showVisualBanner]);

  return (
    <>
      {/* Visually hidden live regions for assistive technologies */}
      <div
        ref={ref}
        data-slot="live-region"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        <div aria-live="polite" aria-atomic="true" role="status">
          {politeMessage}
        </div>
        <div aria-live="assertive" aria-atomic="true" role="alert">
          {assertiveMessage}
        </div>
      </div>

      {/* Optional visible banner for cognitive/visual accessibility with shadcn card/alert styling */}
      {showVisualBanner && activeBanner && (
        <div
          role="status"
          className={cn(
            "fixed bottom-5 right-5 z-50 max-w-md rounded-lg p-4 shadow-lg border transition-all flex items-start gap-3",
            adaptations.highContrast
              ? "bg-black text-white border-2 border-yellow-400 font-bold"
              : activeBanner.priority === "assertive"
              ? "bg-destructive/10 text-destructive border-destructive/50 dark:border-destructive"
              : activeBanner.category === "success"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
              : "bg-popover text-popover-foreground border-border shadow-md",
            className
          )}
        >
          {activeBanner.priority === "assertive" ? (
            <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
          ) : activeBanner.category === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
          ) : (
            <Info className="size-5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
          )}
          <span className="font-medium text-sm leading-relaxed">
            {activeBanner.category ? `[${activeBanner.category.toUpperCase()}] ` : ""}
            {activeBanner.message}
          </span>
        </div>
      )}
    </>
  );
});

TederashLiveRegion.displayName = "TederashLiveRegion";

export const LiveRegion = TederashLiveRegion;
export const AccessibleLiveRegion = TederashLiveRegion;
