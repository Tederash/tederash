"use client";

import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { useTederash } from "@tederash/react";

interface CodeSnippet {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  code: string;
}

const SNIPPETS: CodeSnippet[] = [
  {
    id: "provider",
    stepNumber: "Step 1",
    title: "Wrap your application",
    description: "Provide the runtime context at the root of your React application with a default accessibility profile and local storage key.",
    code: `import { AccessibilityProvider } from "@tederash/react";
import { DEFAULT_PROFILE } from "@tederash/core";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider
      defaultProfile={DEFAULT_PROFILE}
      storageKey="my-app:accessibility-profile"
    >
      {children}
    </AccessibilityProvider>
  );
}`,
  },
  {
    id: "components",
    stepNumber: "Step 2",
    title: "Use adaptive UI components",
    description: "Drop in Tederash components. They inherit standard HTML and Radix props while adapting their geometry, contrast, and cognitive helpers dynamically.",
    code: `import { AccessibleButton, AccessibleInput, AccessibleForm } from "@tederash/components";

export function ContactForm() {
  return (
    <AccessibleForm onSubmit={handleSave}>
      <AccessibleInput
        label="Email address"
        type="email"
        description="We use this address to send account security notices."
        simplifiedDescription="Enter your primary email address."
        required
      />
      <AccessibleButton variant="primary" type="submit">
        Save preferences
      </AccessibleButton>
    </AccessibleForm>
  );
}`,
  },
  {
    id: "announcements",
    stepNumber: "Step 3",
    title: "Dispatch assistive announcements",
    description: "Use the announce hook to inform screen readers and live regions of dynamic interface changes without creating collisions.",
    code: `import { useAccessibility } from "@tederash/react";

export function BookingWidget() {
  const { announce } = useAccessibility();

  const handleBooking = async () => {
    await submitBooking();
    announce({
      message: "Appointment confirmed for Thursday at 2:00 PM.",
      priority: "polite",
      category: "success",
    });
  };

  return <button onClick={handleBooking}>Confirm booking</button>;
}`,
  },
];

export function CodeWalkthrough() {
  const [activeTab, setActiveTab] = useState(SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);
  const { announce } = useTederash();

  const activeSnippet = SNIPPETS.find((s) => s.id === activeTab) || SNIPPETS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      announce({
        message: `Copied code for ${activeSnippet.title} to clipboard.`,
        priority: "polite",
        category: "info",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <section
      aria-labelledby="code-heading"
      className="py-16 md:py-24 border-b border-border bg-muted/20"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Developer Experience</span>
          </div>
          <h2
            id="code-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            Integrate in three clear steps.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            No messy conditional classes or duplicated accessibility templates. Write standard React code
            and let the Tederash adaptation engine handle touch targets, contrast ratios, and live announcements.
          </p>
        </div>

        {/* Step Selector Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SNIPPETS.map((snippet) => {
            const isActive = snippet.id === activeTab;
            return (
              <button
                key={snippet.id}
                onClick={() => setActiveTab(snippet.id)}
                aria-pressed={isActive}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                <span className="opacity-75 font-mono">{snippet.stepNumber}:</span>
                <span>{snippet.title}</span>
              </button>
            );
          })}
        </div>

        {/* Code Snippet Box */}
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
            <div>
              <span className="text-xs font-bold text-foreground">
                {activeSnippet.title}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSnippet.description}
              </p>
            </div>
            <button
              onClick={handleCopy}
              aria-label={copied ? "Code copied to clipboard" : "Copy code snippet"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-5 font-mono text-xs sm:text-sm text-foreground overflow-x-auto leading-relaxed bg-background">
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
