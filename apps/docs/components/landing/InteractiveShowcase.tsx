"use client";

import React, { useState } from "react";
import {
  TederashButton,
  TederashInput,
  TederashSelect,
  TederashCheckbox,
} from "@tederash/components";
import {
  PRESET_PROFILES,
  TargetSize,
  useTederash,
} from "@tederash/react";
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Languages,
} from "lucide-react";

export function InteractiveShowcase() {
  const {
    profile,
    adaptations,
    setProfile,
    updatePreferences,
    resetProfile,
    announce,
  } = useTederash();

  // Form State
  const [fullName, setFullName] = useState("Liya Kebede");
  const [email, setEmail] = useState("liya@example.com");
  const [role, setRole] = useState("engineer");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Announcer Feed History
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; time: string; text: string; priority: string }>
  >([
    {
      id: "initial",
      time: "Initial",
      text: "Tederash runtime initialized with active profile: " + profile.name,
      priority: "polite",
    },
  ]);

  const pushAnnouncement = (text: string, priority: "polite" | "assertive" = "polite") => {
    announce({ message: text, priority, category: "info" });
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAnnouncements((prev) => [
      { id: Math.random().toString(36).slice(2), time: timeStr, text, priority },
      ...prev.slice(0, 4),
    ]);
  };

  const handlePresetChange = (presetId: string) => {
    const selected = PRESET_PROFILES.find((p) => p.id === presetId);
    if (selected) {
      setProfile(selected);
      pushAnnouncement(`Applied profile preset: ${selected.name}`);
    }
  };

  const handleFontScaleChange = (scale: number) => {
    updatePreferences({ visual: { fontScale: scale } });
    pushAnnouncement(`Adjusted text scale factor to ${scale.toFixed(2)}x`);
  };

  const handleTargetSizeChange = (targetSize: TargetSize) => {
    updatePreferences({ motor: { targetSize } });
    const pxMap: Record<TargetSize, number> = { normal: 44, large: 56, "extra-large": 64 };
    pushAnnouncement(`Updated minimum touch target to ${pxMap[targetSize]}px (${targetSize})`);
  };

  const handleToggleContrast = () => {
    const nextVal = !adaptations.highContrast;
    updatePreferences({ visual: { highContrast: nextVal } });
    pushAnnouncement(nextVal ? "Enabled 2px high-contrast borders." : "Switched to standard contrast.");
  };

  const handleToggleCognitive = () => {
    const nextVal = !profile.cognitive?.simplifiedLanguage;
    updatePreferences({
      cognitive: {
        simplifiedLanguage: nextVal,
        showInstructions: nextVal,
        guidedInteraction: nextVal,
      },
    });
    pushAnnouncement(
      nextVal
        ? "Activated cognitive guidance and plain language helpers."
        : "Disabled cognitive guidance helpers."
    );
  };

  const handleToggleLocale = () => {
    const nextLocale = profile.locale === "am" ? "en" : "am";
    updatePreferences({ locale: nextLocale });
    pushAnnouncement(
      nextLocale === "am"
        ? "የአማርኛ ቋንቋ እና የጊዕዝ ፊደል ቅርጸት ተመርጧል።"
        : "Switched interface language to English."
    );
  };

  const handleReset = () => {
    resetProfile();
    pushAnnouncement("Reset all accessibility preferences to framework defaults.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setFormError("A valid email address with an '@' symbol is required.");
      pushAnnouncement("Form submission error: invalid email format.", "assertive");
      return;
    }
    if (!acceptedTerms) {
      setFormError("Please check the agreement box before submitting.");
      pushAnnouncement("Form submission error: terms agreement required.", "assertive");
      return;
    }
    setFormError(null);
    setFormSubmitted(true);
    pushAnnouncement("Profile saved. All inputs validated successfully.", "polite");
    setTimeout(() => setFormSubmitted(false), 4000);
  };

  const isAmharic = profile.locale === "am";

  return (
    <section
      id="interactive-specimen"
      aria-labelledby="specimen-heading"
      className="py-16 md:py-24 border-b border-border bg-muted/20"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Interactive Demonstration</span>
            </div>
            <h2
              id="specimen-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
            >
              Test runtime adaptations live.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Modify accessibility preferences on the left and observe the registration specimen on the right
              adapt touch target height, focus outlines, cognitive helper copy, and screen-reader announcements immediately.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-fit focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Preferences</span>
          </button>
        </div>

        {/* Two-Column Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6 p-6 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Runtime Preferences
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {profile.id}
              </span>
            </div>

            {/* Presets Select */}
            <div className="flex flex-col gap-2">
              <label htmlFor="workbench-preset-select" className="text-xs font-semibold text-foreground">
                Preset Profile
              </label>
              <select
                id="workbench-preset-select"
                value={profile.id}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {PRESET_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Scale Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Font Scale Multiplier</span>
                <span className="font-mono text-muted-foreground">
                  {adaptations.fontScale.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.5"
                step="0.05"
                value={adaptations.fontScale}
                onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
                aria-label="Text scale factor slider"
                className="w-full accent-teal-600 dark:accent-teal-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0.90x (Compact)</span>
                <span>1.20x (Standard)</span>
                <span>1.50x (Scaled)</span>
              </div>
            </div>

            {/* Minimum Touch Target Selection */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Touch Target Height</span>
                <span className="font-mono text-muted-foreground">
                  {adaptations.minTargetHeight}px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "large", "extra-large"] as TargetSize[]).map((size) => {
                  const px = size === "normal" ? 44 : size === "large" ? 56 : 64;
                  const isCurrent = (profile.motor?.targetSize ?? "normal") === size;
                  return (
                    <button
                      key={size}
                      onClick={() => handleTargetSizeChange(size)}
                      aria-pressed={isCurrent}
                      className={`px-2 py-2 rounded-lg text-xs font-medium text-center border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className="block font-bold">{px}px</span>
                      <span className="text-[10px] opacity-80 capitalize">{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="flex flex-col gap-3 pt-3 border-t border-border">
              {/* High Contrast Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">High Contrast</span>
                  <span className="text-[11px] text-muted-foreground">
                    Enforces 2px solid borders on inputs and buttons
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adaptations.highContrast}
                  onClick={handleToggleContrast}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    adaptations.highContrast ? "bg-teal-600 dark:bg-teal-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      adaptations.highContrast ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Cognitive Helpers Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Cognitive Guidance</span>
                  <span className="text-[11px] text-muted-foreground">
                    Shows plain-language instructions and step cues
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!profile.cognitive?.simplifiedLanguage}
                  onClick={handleToggleCognitive}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    profile.cognitive?.simplifiedLanguage ? "bg-teal-600 dark:bg-teal-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      profile.cognitive?.simplifiedLanguage ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Language Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Language Locale</span>
                  <span className="text-[11px] text-muted-foreground">
                    Switch between English and Amharic (አማርኛ)
                  </span>
                </div>
                <button
                  onClick={handleToggleLocale}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-background text-xs font-semibold hover:bg-muted text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>{isAmharic ? "አማርኛ (am)" : "English (en)"}</span>
                </button>
              </div>
            </div>

            {/* Live WCAG Geometry Card */}
            <div className="mt-2 p-3 rounded-lg border border-border bg-background text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>WCAG 2.2 AA Conformance Metrics</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                SC 2.5.8 (Target Size Minimum): Required ≥ 24px. Current target height is calibrated to{" "}
                <strong className="text-foreground">{adaptations.minTargetHeight}px</strong>.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Adaptive Specimen */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="p-6 sm:p-8 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isAmharic ? "የአባልነት ምዝገባ ቅጽ" : "Adaptive Member Registration"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAmharic
                      ? "ይህ ቅጽ ከተመረጠው የተደራሽነት ፕሮፋይል ጋር በቅጽበት ይስማማል።"
                      : "Components adapt sizing, typography, and contrast automatically."}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded">
                  <span>Target:</span>
                  <span className="font-mono font-bold text-foreground">
                    {adaptations.minTargetHeight}px
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              {formSubmitted && (
                <div
                  role="status"
                  className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/30 text-foreground flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-xs font-bold block text-teal-700 dark:text-teal-300">
                      {isAmharic ? "ምዝገባዎ በተሳካ ሁኔታ ተከናውኗል!" : "Registration submitted successfully!"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {isAmharic
                        ? "የተከናወነው መረጃ ለስክሪን አንባቢ በትክክል ተላልፏል።"
                        : "A polite screen-reader announcement has been dispatched to assistive devices."}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-foreground flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-xs font-bold block text-destructive">
                      {isAmharic ? "ስህተት ተከስቷል" : "Validation Error"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      {formError}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Specimen */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <TederashInput
                  label={isAmharic ? "ሙሉ ስም" : "Full Name"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  description={
                    isAmharic
                      ? "ሙሉ ህጋዊ ወይም የሚመርጡትን ማሳያ ስም ያስገቡ።"
                      : "Enter your legal or preferred display name."
                  }
                  simplifiedDescription={
                    isAmharic ? "ትክክለኛ ስምዎን እዚህ ይጻፉ።" : "Type your first and last name here."
                  }
                  required
                />

                <TederashInput
                  label={isAmharic ? "የኢሜይል አድራሻ" : "Email Address"}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  description={
                    isAmharic
                      ? "ከመለያዎ ጋር የተገናኘውን የኢሜይል አድራሻ ያስገቡ።"
                      : "We use this address for account verification and access."
                  }
                  simplifiedDescription={
                    isAmharic ? "የኢሜይል አድራሻዎን ያስገቡ።" : "Your email address."
                  }
                  required
                />

                <TederashSelect
                  label={isAmharic ? "የሥራ ድርሻ" : "Role or Specialty"}
                  value={role}
                  onChange={(val) => setRole(val)}
                  description={
                    isAmharic ? "በድርጅቱ ውስጥ ያለዎትን ድርሻ ይምረጡ።" : "Select your primary engineering discipline."
                  }
                  options={[
                    { value: "engineer", label: isAmharic ? "የሶፍትዌር መሃንዲስ" : "Software Engineer" },
                    { value: "a11y-lead", label: isAmharic ? "የተደራሽነት ባለሙያ" : "Accessibility Specialist" },
                    { value: "designer", label: isAmharic ? "የምርት ዲዛይነር" : "Product Designer" },
                  ]}
                />

                <TederashCheckbox
                  id="specimen-agreement-checkbox"
                  label={
                    isAmharic
                      ? "የአጠቃቀም መመሪያዎችን እና ግላዊነት ፖሊሲን ተቀብያለሁ"
                      : "I agree to the accessibility compliance charter"
                  }
                  description={
                    isAmharic
                      ? "የተጠቃሚዎችን መብት ለማክበር መስማማት ግዴታ ነው።"
                      : "Confirms that you will uphold accessible interaction standards."
                  }
                  simplifiedDescription={
                    isAmharic ? "ለመቀጠል እዚህ ምልክት ያድርጉ።" : "Check here to confirm."
                  }
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                />

                {/* Form Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <TederashButton variant="primary" type="submit">
                    {isAmharic ? "ቅጹን አስገባ" : "Submit Registration"}
                  </TederashButton>

                  <TederashButton
                    variant="destructive"
                    type="button"
                    confirmDestructivePrompt={
                      isAmharic
                        ? "ቅጹን ሙሉ በሙሉ ማጽዳት ይፈልጋሉ?"
                        : "Are you sure you want to discard your input and reset this form?"
                    }
                    onClick={() => {
                      setFullName("");
                      setEmail("");
                      setRole("engineer");
                      setAcceptedTerms(false);
                      setFormError(null);
                      pushAnnouncement("Form fields reset to blank values.");
                    }}
                  >
                    {isAmharic ? "ቅጹን አጽዳ" : "Reset Form"}
                  </TederashButton>
                </div>
              </form>
            </div>

            {/* Live Screen-Reader Announcer Log */}
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>Assistive Announcement Bus (Live Region Log)</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  aria-live=&quot;polite&quot;
                </span>
              </div>

              <div className="flex flex-col gap-1.5 font-mono text-xs">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 p-2 rounded bg-muted/50 border border-border/50"
                  >
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      [{item.time}]
                    </span>
                    <span className="text-foreground leading-snug">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
