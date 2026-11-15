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

  if (!mounted) {
    return (
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground"
        aria-hidden="true"
      >
        <span className="w-5 h-5 block" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    try {
      updatePreferences({ visual: { colorScheme: nextTheme } });
    } catch {
      // safe fallback if provider is outside scope
    }
    announce({
      message: `Theme switched to ${nextTheme} mode`,
      priority: "polite",
      category: "info",
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-colors" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 hover:text-slate-900 transition-colors" aria-hidden="true" />
      )}
    </button>
  );
}
