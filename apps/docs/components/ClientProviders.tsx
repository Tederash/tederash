"use client";

import * as React from "react";
import { TederashProvider } from "@tederash/react";
import { TederashLiveRegion } from "@tederash/components";
import { AccessibilityControlPanel } from "./AccessibilityControlPanel";
import { TocProgress } from "./TocProgress";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <TederashProvider storageKey="tederash:app:profile">
      <TocProgress />
      <AccessibilityControlPanel />
      {/* Sit above the floating ♿ button instead of covering it */}
      <TederashLiveRegion showVisualBanner={true} className="bottom-24" />
      {children}
    </TederashProvider>
  );
}
