"use client";

import * as React from "react";
import { useTheme } from "nextra-theme-docs";
import { Sun, Moon } from "lucide-react";
import { useAccessibility } from "@tederash/react";

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { announce, updatePreferences } = useAccessibility();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    try {
      updatePreferences({
        visual: {
          colorScheme: nextTheme,
          highContrast: false,
        },
      });
    } catch {
      // safe fallback if provider is outside scope
    }
    announce({
      message: `Theme switched to ${nextTheme} mode`,
      priority: "polite",
      category: "info",
    });
  };

  if (!mounted) {
    return (
      <div
        className="w-8 h-8 rounded-lg border border-border/80 bg-background/50"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex w-8 h-8 items-center justify-center rounded-lg border border-border/80 bg-background/50 hover:bg-accent text-foreground/80 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
    >
      {isDark ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
