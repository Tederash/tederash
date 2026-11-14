"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTederash } from "@tederash/react";

export function CopyButton({ text, label = "Copy code" }: { text: string; label?: string }) {
  const { announce } = useTederash();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce({ message: "Copied to clipboard.", priority: "polite", category: "info" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the code is still visible to copy by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {copied ? (
        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
