"use client";

import React from "react";
import { Languages, Type, Globe, CheckCircle2 } from "lucide-react";
import { useTederash } from "@tederash/react";

export function LocalizationFeature() {
  const { profile, updatePreferences, announce } = useTederash();

  const handleActivateAmharic = () => {
    updatePreferences({ locale: "am" });
    announce({
      message: "የአማርኛ ቋንቋ እና የጊዕዝ ፊደል ቅርጸት ነቅቷል።",
      priority: "polite",
      category: "info",
    });
  };

  return (
    <section
      aria-labelledby="localization-heading"
      className="py-16 md:py-24 border-b border-border bg-card"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text Explanation */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ethiopian Context & Ge&apos;ez Typography</span>
            </div>

            <h2
              id="localization-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
            >
              ተደራሽ (Tederash): Built with bilingual accessibility from day one.
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              In Amharic, &quot;Tederash&quot; signifies reachability and inclusivity. Rather than treating
              localization as an afterthought, the framework embeds dedicated Ge&apos;ez typography rules,
              cultural validation phrases, and offline dictionaries directly into the core runtime.
            </p>

            <div className="mt-2 flex flex-col gap-3 text-xs sm:text-sm text-foreground/90">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Diacritic Rhythm:</strong> Calibrated 1.8x line-height prevents vertical clipping of
                  stacked Ethiopic vowel indicators across all screen densities.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Natural Amharic Dictionary:</strong> Accessible error messages and cognitive guidance
                  written in culturally intuitive phrasing, not machine-translated jargon.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Offline Resilience:</strong> Fully functional on low-bandwidth networks with zero
                  external font or translation API calls.
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleActivateAmharic}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Languages className="w-4 h-4" aria-hidden="true" />
                <span>የአማርኛ ቋንቋን ይሞክሩ (Try Amharic Preset)</span>
              </button>
            </div>
          </div>

          {/* Right Visual Comparison Card */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-xl border border-border bg-background shadow-sm flex flex-col gap-6">
            <div className="pb-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Ge&apos;ez Script Typographic Specimen
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                line-height: 1.8
              </span>
            </div>

            {/* Specimen Box */}
            <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">ተደራሽነት ለሁሉም ዲጂታል መድረኮች</span>
                <span className="font-mono text-[10px]">am-ET</span>
              </div>

              <p className="text-base sm:text-lg text-foreground font-serif leading-[1.8]">
                &quot;ተደራሽነት ማለት ውጫዊ መሣሪያ ወይም ቅንብር ብቻ ሳይሆን እያንዳንዱ ሰው በራሱ ምርጫና ፍላጎት መሰረት
                የዲጂታል አገልግሎቶችን በቀላሉ፣ ያለምንም እንቅፋት እንዲጠቀም ማስቻል ነው።&quot;
              </p>

              <div className="pt-3 border-t border-border/60 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  Font Stack: Nyala, Noto Sans Ethiopic
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  Direction: LTR
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                  Contrast: 7:1
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
