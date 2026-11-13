"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { AccessibilityProvider } from "@tederash/react";
import { LiveRegion } from "@tederash/components";
import { AccessibilityControlPanel } from "./AccessibilityControlPanel";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const content = (
    <AccessibilityProvider storageKey="tederash:playground:a11y">
      <AccessibilityControlPanel />
      <LiveRegion showVisualBanner={true} />
      {children}
    </AccessibilityProvider>
  );

  if (hasClerkKey) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
