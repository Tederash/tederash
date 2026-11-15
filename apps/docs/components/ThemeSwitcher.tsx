"use client";

import * as React from "react";
import { useTheme } from "nextra-theme-docs";
import { Sun, Moon, Contrast } from "lucide-react";
import { useAccessibility } from "@tederash/react";

type ThemeMode = "light" | "dark" | "high-contrast";

const THEMES: Array<{ id: ThemeMode; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light theme", Icon: Sun },
  { id: "dark", label: "Dark theme", Icon: Moon },
  { id: "high-contrast", label: "High contrast theme", Icon: Contrast },
];

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { profile, announce, updatePreferences } = useAccessibility();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isHighContrast = Boolean(profile?.visual?.highContrast);
  const currentMode: ThemeMode = isHighContrast
    ? "high-contrast"
    : resolvedTheme === "dark" || theme === "dark"
      ? "dark"
      : "light";

  React.useEffect(() => {
    if (!mounted) return;
    if (isHighContrast) {
      document.documentElement.setAttribute("data-theme", "high-contrast");
      document.documentElement.setAttribute("data-a11y-high-contrast", "true");
    } else {
      if (document.documentElement.getAttribute("data-theme") === "high-contrast") {
        document.documentElement.removeAttribute("data-theme");
      }
      document.documentElement.setAttribute("data-a11y-high-contrast", "false");
    }
  }, [isHighContrast, mounted]);

  const handleSelect = (mode: ThemeMode) => {
    if (mode === "high-contrast") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "high-contrast");
      document.documentElement.setAttribute("data-a11y-high-contrast", "true");
      try {
        updatePreferences({
          visual: {
            colorScheme: "dark",
            highContrast: true,
          },
        });
      } catch {}
      announce({
        message: "High contrast theme activated",
        priority: "polite",
        category: "info",
      });
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.setAttribute("data-a11y-high-contrast", "false");
      setTheme(mode);
      try {
        updatePreferences({
          visual: {
            colorScheme: mode,
            highContrast: false,
          },
        });
      } catch {}
      announce({
        message: `Theme switched to ${mode} mode`,
        priority: "polite",
        category: "info",
      });
    }
  };

  if (!mounted) {
    return (
      <div
        className="flex items-center rounded-full border border-border bg-muted/40 p-0.5"
        aria-hidden="true"
      >
        <span className="w-7 h-7 inline-block" />
        <span className="w-7 h-7 inline-block" />
        <span className="w-7 h-7 inline-block" />
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center rounded-full border border-border bg-muted/40 p-0.5"
    >
      {THEMES.map(({ id, label, Icon }) => {
        const isActive = currentMode === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => handleSelect(id)}
            className={`inline-flex w-7 h-7 items-center justify-center rounded-full outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
              isActive
                ? "bg-background text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
