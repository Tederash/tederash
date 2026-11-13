import * as React from "react";
import { Announcement } from "@tederash/core";
import { useAccessibility } from "@tederash/react";

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
export function TederashLiveRegion({ showVisualBanner = false, className = "" }: TederashLiveRegionProps) {
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

      {/* Optional visible banner for cognitive/visual accessibility */}
      {showVisualBanner && activeBanner && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-md rounded-lg p-4 shadow-lg border transition-all ${
            adaptations.highContrast
              ? "bg-black text-white border-2 border-yellow-400"
              : activeBanner.priority === "assertive"
              ? "bg-red-50 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800"
              : "bg-white text-gray-900 border-gray-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          } ${className}`}
        >
          <div className="flex items-start gap-3">
            <span className="font-semibold text-sm">
              {activeBanner.category ? `[${activeBanner.category.toUpperCase()}] ` : ""}
              {activeBanner.message}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export const LiveRegion = TederashLiveRegion;
export const AccessibleLiveRegion = TederashLiveRegion;
