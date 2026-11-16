"use client";

import React from "react";
import Link from "next/link";
import type { Locale } from "@tederash/core";
import { useLandingTranslation } from "./landing/translations";

export function NavbarLinks() {
  const { locale, t, setLocale } = useLandingTranslation();

  return (
    <div className="flex items-center gap-4 text-xs font-semibold mr-2 max-md:hidden">
      <Link href="/docs" className="hover:opacity-80 transition-opacity">
        {t.navbar.docs}
      </Link>
      <Link href="/test" className="hover:opacity-80 transition-opacity">
        {t.navbar.demo}
      </Link>

      {/* Language Switcher in Header */}
      <div
        className="flex items-center border border-border/80 rounded-full px-1 py-0.5 bg-muted/40 text-[11px]"
        role="group"
        aria-label="Language"
      >
        {[
          { id: "en", label: "EN" },
          { id: "am", label: "አማ" },
          { id: "om", label: "OM" },
        ].map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => setLocale(lang.id as Locale)}
            aria-pressed={locale === lang.id}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              locale === lang.id
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
