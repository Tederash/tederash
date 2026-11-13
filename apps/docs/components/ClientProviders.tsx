"use client";

import * as React from "react";
import { AccessibilityProvider } from "@tederash/react";
import { LiveRegion } from "@tederash/components";
import { AccessibilityControlPanel } from "./AccessibilityControlPanel";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider storageKey="tederash:app:a11y">
      <AccessibilityControlPanel />
      <LiveRegion showVisualBanner={true} />
      {children}
    </AccessibilityProvider>
  );
}
