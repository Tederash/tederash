"use client";

import * as React from "react";
import Link from "next/link";
import {
  PRESET_PROFILES,
  useAccessibility,
  useLocale,
  useSpeechSynthesis,
  useSpeechRecognition,
} from "@tederash/react";
import {
  AccessibleButton,
  AccessibleForm,
  AccessibleInput,
} from "@tederash/components";
import { HeroIsometricShowcase } from "../components/HeroIsometricShowcase";
import {
  Sparkles,
  Check,
  Copy,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Layers,
  Layout,
  Mic,
  Brain,
  Globe,
  Sliders,
  Keyboard,
  Volume2,
  Heart,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";

export default function Home() {
  const { profile, adaptations, setProfile, announce } = useAccessibility();
  const { t, locale } = useLocale();
  const { speak, cancel, isSpeaking, isSupported: speechSupported } =
    useSpeechSynthesis();
  const {
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    isListening,
    isSupported: recognitionSupported,
    error: recognitionError,
    resetTranscript,
  } = useSpeechRecognition();

  // Copy command state
  const [copiedCommand, setCopiedCommand] = React.useState(false);
  const installCommand = "pnpm add @tederash/core @tederash/react @tederash/components";

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(installCommand);
    setCopiedCommand(true);
    announce({
      message: "Installation command copied to clipboard.",
      priority: "polite",
      category: "info",
    });
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  // Registration form state
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = React.useState<string[]>([]);
  const [submittedSuccess, setSubmittedSuccess] = React.useState(false);

  // Guided multi-step wizard (engaged when the profile enables guided interaction)
  const guided = adaptations.guidedInteraction;
  const totalSteps = 3;
  const [step, setStep] = React.useState(0);
  const stepFields: Array<Array<keyof typeof formData>> = [
    ["fullName", "email"],
    ["password"],
    ["fullName", "email", "password"],
  ];
  const stepTitles = [
    t("labels.stepAccount"),
    t("labels.stepSecurity"),
    t("labels.stepReview"),
  ];

  // Voice dictation state: which field is receiving dictated text
  const [dictationTarget, setDictationTarget] = React.useState<
    keyof typeof formData | null
  >(null);
  const appliedTranscriptRef = React.useRef("");

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when typing
    if (formErrors.length > 0) setFormErrors([]);
  };

  const validateFieldValues = (
    fields: Array<keyof typeof formData>
  ): string[] => {
    const errors: string[] = [];
    if (fields.includes("fullName") && !formData.fullName.trim()) {
      errors.push(t("errors.required", { field: t("labels.fullName") }));
    }
    if (
      fields.includes("email") &&
      (!formData.email.trim() || !formData.email.includes("@"))
    ) {
      errors.push(t("errors.invalidEmail"));
    }
    if (fields.includes("password") && formData.password.length < 8) {
      errors.push(t("errors.weakPassword", { min: 8 }));
    }
    return errors;
  };

  const reportErrors = (errors: string[]) => {
    setFormErrors(errors);
    announce({
      message: t("announcements.formError"),
      priority: "assertive",
      category: "error",
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateFieldValues(["fullName", "email", "password"]);

    if (errors.length > 0) {
      setSubmittedSuccess(false);
      reportErrors(errors);
    } else {
      setFormErrors([]);
      setSubmittedSuccess(true);
      announce({
        message: t("announcements.formSubmitted"),
        priority: "polite",
        category: "success",
      });
    }
  };

  const handleNext = () => {
    const errors = validateFieldValues(stepFields[step]);
    if (errors.length > 0) {
      reportErrors(errors);
      return;
    }
    setFormErrors([]);
    const nextStep = Math.min(step + 1, totalSteps - 1);
    setStep(nextStep);
    announce({
      message: t("labels.stepProgress", {
        current: nextStep + 1,
        total: totalSteps,
      }),
      priority: "polite",
      category: "info",
    });
  };

  const handleBack = () => {
    setFormErrors([]);
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    announce({
      message: t("labels.stepProgress", {
        current: prevStep + 1,
        total: totalSteps,
      }),
      priority: "polite",
      category: "info",
    });
  };

  const handleReset = () => {
    setFormData({ fullName: "", email: "", password: "" });
    setFormErrors([]);
    setSubmittedSuccess(false);
    setStep(0);
    announce({
      message: t("announcements.operationCompleted"),
      priority: "polite",
      category: "info",
    });
  };

  const handleReadInstructions = () => {
    if (isSpeaking) {
      cancel();
      return;
    }
    speak(
      `${t("labels.fullName")}: ${t("labels.fullNameHelp")}. ` +
        `${t("labels.email")}: ${t("labels.emailHelp")}. ` +
        `${t("labels.password")}: ${t("labels.passwordHelp", { min: 8 })}.`,
      { lang: profile.speech?.language ?? "en-US" }
    );
  };

  // Voice dictation: apply newly recognized (final) transcript to the target field
  React.useEffect(() => {
    if (!dictationTarget || !transcript) return;
    const addition = transcript.startsWith(appliedTranscriptRef.current)
      ? transcript.slice(appliedTranscriptRef.current.length).trim()
      : transcript.trim();
    if (addition) {
      setFormData((prev) => ({
        ...prev,
        [dictationTarget]: prev[dictationTarget]
          ? `${prev[dictationTarget]} ${addition}`
          : addition,
      }));
    }
    appliedTranscriptRef.current = transcript;
  }, [transcript, dictationTarget]);

  const startDictation = (field: keyof typeof formData) => {
    resetTranscript();
    appliedTranscriptRef.current = "";
    setDictationTarget(field);
    startListening({ lang: profile.speech?.language ?? "en-US" });
    announce({
      message: t("announcements.listening"),
      priority: "polite",
      category: "info",
    });
  };

  const stopDictation = () => {
    stopListening();
    setDictationTarget(null);
    announce({
      message: t("announcements.listeningStopped"),
      priority: "polite",
      category: "info",
    });
  };

  // Mic button rendered next to dictation-capable fields
  const renderDictationButton = (
    field: keyof typeof formData,
    fieldLabel: string
  ) => {
    if (!adaptations.speechInputEnabled || !recognitionSupported) return null;
    const active = isListening && dictationTarget === field;
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={
          active
            ? t("labels.stopDictation")
            : t("labels.dictateField", { field: fieldLabel })
        }
        onClick={() => (active ? stopDictation() : startDictation(field))}
        className={`mt-2 inline-flex items-center justify-center gap-2 px-3 min-h-[40px] rounded-lg border text-xs font-medium transition-colors ${
          active
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-border bg-background hover:bg-muted"
        }`}
      >
        <span aria-hidden="true">{active ? "⏹" : "🎙"}</span>
        {active ? t("labels.stopDictation") : t("labels.dictateField", { field: fieldLabel })}
      </button>
    );
  };

  // Live interim transcript preview for the active dictation field
  const renderInterimTranscript = (field: keyof typeof formData) =>
    isListening && dictationTarget === field && interimTranscript ? (
      <p aria-live="polite" className="text-xs text-muted-foreground mt-1">
        {interimTranscript}
      </p>
    ) : null;

  // Social share intent links
  const shareUrl = "https://tederash.dev/";
  const shareText = "Tederash Adaptive Accessibility Framework — Make every web app adapt to every human need";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTextWithUrl = encodeURIComponent(`${shareText} ${shareUrl}`);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-24">
      {/* =========================================================================
          HERO SECTION — 3D ISOMETRIC LAYERED SHOWCASE (DESIGNCODE STYLE)
          ========================================================================= */}
      <HeroIsometricShowcase />

      {/* =========================================================================
          INTERACTIVE DEMO SECTION (#demo)
          ========================================================================= */}
      <section
        id="demo"
        aria-labelledby="demo-heading"
        className="flex flex-col gap-8 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>⚡</span> Live Interactive Showcase
            </div>
            <h2 id="demo-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Adaptive Registration Form &amp; Runtime Inspector
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Switch between 7 real-world accessibility profiles below to observe how the exact same form components
              adapt their touch targets, typography, contrast, audio feedback, and guided wizard mode without page reload.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-card border border-border">
            <span className="text-muted-foreground">Current Profile:</span>
            <span className="text-primary font-bold">{profile.name}</span>
          </div>
        </div>

        {/* Preset Profile Switcher Bar */}
        <section
          aria-labelledby="profiles-heading"
          className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <h3 id="profiles-heading" className="text-sm font-bold text-foreground">
              Select an Accessibility Profile:
            </h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Click any profile to test runtime adaptation
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {PRESET_PROFILES.map((p) => {
              const isActive = profile.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setProfile(p);
                    announce({
                      message: `Activated ${p.name} profile.`,
                      priority: "polite",
                    });
                  }}
                  aria-pressed={isActive}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary ring-offset-2"
                      : "border-border bg-background hover:bg-muted text-foreground font-medium"
                  }`}
                >
                  <span className="text-xs leading-tight">{p.name}</span>
                  <span
                    className={`text-[10px] line-clamp-1 mt-1 ${
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Adaptive Registration Form */}
          <section
            aria-labelledby="form-heading"
            className="lg:col-span-7 flex flex-col gap-5 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="border-b pb-4">
              <h3 id="form-heading" className="text-xl font-bold">
                Adaptive Registration Form
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Demonstrates form validation feedback, touch target sizing, cognitive
                instruction adaptations, guided multi-step flow, voice dictation,
                and Amharic (Ge&apos;ez) localization.
              </p>
              {adaptations.speechOutputEnabled && speechSupported && (
                <button
                  type="button"
                  onClick={handleReadInstructions}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium min-h-[40px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <Volume2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                  <span>{isSpeaking ? "Stop reading" : "Read field instructions aloud"}</span>
                </button>
              )}
              {adaptations.speechOutputEnabled && !speechSupported && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Voice output is enabled in your profile, but this browser does
                  not support speech synthesis.
                </p>
              )}
            </div>

            {submittedSuccess ? (
              <div
                role="status"
                className="p-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100 flex flex-col gap-3"
              >
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Registration Successful!</span>
                </h4>
                <p className="text-sm">
                  Account created for <strong>{formData.fullName}</strong> ({formData.email}).
                  Notice that polite screen-reader announcements were emitted automatically.
                </p>
                <AccessibleButton
                  variant="outline"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setStep(0);
                  }}
                  className="w-fit text-xs mt-2"
                >
                  Register Another User
                </AccessibleButton>
              </div>
            ) : (
              <AccessibleForm
                errors={formErrors}
                onSubmit={handleSubmit}
                successAnnouncement={t("announcements.formSubmitted")}
              >
                {/* Guided mode: progress indicator */}
                {guided && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                      <span>{stepTitles[step]}</span>
                      <span>
                        {t("labels.stepProgress", {
                          current: step + 1,
                          total: totalSteps,
                        })}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={1}
                      aria-valuemax={totalSteps}
                      aria-valuenow={step + 1}
                      aria-label={t("labels.stepProgress", {
                        current: step + 1,
                        total: totalSteps,
                      })}
                      className="flex gap-1.5"
                    >
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                          key={i}
                          aria-hidden="true"
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= step ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Speech recognition status */}
                {adaptations.speechInputEnabled && !recognitionSupported && (
                  <p className="text-xs text-muted-foreground">
                    Voice input is enabled in your profile, but this browser does
                    not support speech recognition. Keyboard and pointer input
                    work normally.
                  </p>
                )}
                {recognitionError && (
                  <p role="alert" className="text-xs text-destructive">
                    {recognitionError}
                  </p>
                )}

                {/* Fields */}
                {(guided ? stepFields[step] : ["fullName", "email", "password"]).map(
                  (field) => {
                    if (field === "fullName") {
                      return (
                        <div key="fullName">
                          <AccessibleInput
                            id="reg-full-name"
                            label={t("labels.fullName")}
                            placeholder="Jane Doe"
                            description={t("labels.fullNameHelp")}
                            simplifiedDescription={t("labels.fullNameHelp")}
                            value={formData.fullName}
                            onChange={(e) => handleInputChange("fullName", e.target.value)}
                            required
                          />
                          {renderDictationButton("fullName", t("labels.fullName"))}
                          {renderInterimTranscript("fullName")}
                        </div>
                      );
                    }
                    if (field === "email") {
                      return (
                        <div key="email">
                          <AccessibleInput
                            id="reg-email"
                            type="email"
                            label={t("labels.email")}
                            placeholder="jane@example.com"
                            description={t("labels.emailHelp")}
                            simplifiedDescription={t("labels.emailHelp")}
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            required
                          />
                          {renderDictationButton("email", t("labels.email"))}
                          {renderInterimTranscript("email")}
                        </div>
                      );
                    }
                    return (
                      <div key="password">
                        <AccessibleInput
                          id="reg-password"
                          type="password"
                          label={t("labels.password")}
                          placeholder="••••••••"
                          description={t("labels.passwordHelp", { min: 8 })}
                          simplifiedDescription={t("labels.passwordHelp", { min: 8 })}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                        />
                        {renderDictationButton("password", t("labels.password"))}
                        {renderInterimTranscript("password")}
                      </div>
                    );
                  }
                )}

                {/* Guided mode review summary */}
                {guided && step === totalSteps - 1 && (
                  <dl className="text-sm flex flex-col gap-2">
                    <div className="flex justify-between border-b pb-1">
                      <dt className="text-muted-foreground">{t("labels.fullName")}</dt>
                      <dd className="font-medium">{formData.fullName || "—"}</dd>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <dt className="text-muted-foreground">{t("labels.email")}</dt>
                      <dd className="font-medium">{formData.email || "—"}</dd>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <dt className="text-muted-foreground">{t("labels.password")}</dt>
                      <dd className="font-medium">{formData.password ? "••••••••" : "—"}</dd>
                    </div>
                  </dl>
                )}

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                  {guided ? (
                    <>
                      <AccessibleButton
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 0}
                        className="w-full sm:w-auto"
                      >
                        {t("labels.back")}
                      </AccessibleButton>
                      {step < totalSteps - 1 ? (
                        <AccessibleButton
                          type="button"
                          variant="primary"
                          onClick={handleNext}
                          className="w-full sm:w-auto"
                        >
                          {t("labels.next")}
                        </AccessibleButton>
                      ) : (
                        <AccessibleButton type="submit" variant="primary" className="w-full sm:w-auto">
                          {t("labels.submit")}
                        </AccessibleButton>
                      )}
                    </>
                  ) : (
                    <>
                      <AccessibleButton type="submit" variant="primary" className="w-full sm:w-auto">
                        {t("labels.submit")}
                      </AccessibleButton>
                      <AccessibleButton
                        type="button"
                        variant="destructive"
                        onClick={handleReset}
                        confirmDestructivePrompt={t("announcements.confirmationRequired")}
                        className="w-full sm:w-auto"
                      >
                        {t("labels.reset")}
                      </AccessibleButton>
                    </>
                  )}
                </div>
              </AccessibleForm>
            )}
          </section>

          {/* Right Column: Live Runtime Inspector */}
          <section
            aria-labelledby="inspector-heading"
            className="lg:col-span-5 flex flex-col gap-4 p-6 rounded-2xl border border-border bg-card shadow-sm"
          >
            <h3 id="inspector-heading" className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Active Runtime Inspector</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Current adaptations applied globally to the application DOM via CSS custom properties and attributes.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Active Profile:</span>
                <span className="font-semibold">{profile.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Locale:</span>
                <span className="font-mono font-bold text-primary">
                  {locale}
                  <span className="font-sans font-medium text-muted-foreground">
                    {" "}
                    ({t("labels.email")} → {adaptations.typography.fontFamily.split("'")[1]})
                  </span>
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Font Scale:</span>
                <span className="font-mono font-bold text-primary">
                  {(adaptations.fontScale * 100).toFixed(0)}% ({adaptations.fontScale}x)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Touch Target Height:</span>
                <span className="font-mono font-bold">{adaptations.minTargetHeight}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Focus Ring Style:</span>
                <span className="font-semibold capitalize">{adaptations.focusIndicator}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">High Contrast:</span>
                <span className="font-semibold">{adaptations.highContrast ? "Enabled (true)" : "Disabled (false)"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Underline Links:</span>
                <span className="font-semibold">{adaptations.underlineLinks ? "Active" : "Standard"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Simplified Plain Language:</span>
                <span className="font-semibold">{adaptations.simplifiedLanguage ? "Active" : "Standard"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Confirmation on Destructive:</span>
                <span className="font-semibold">{adaptations.confirmationBeforeDestructiveActions ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl mt-2">
              <div className="text-[11px] font-bold text-muted-foreground mb-1">
                Active CSS Custom Properties:
              </div>
              <pre className="text-[10px] font-mono overflow-x-auto p-2 bg-background/80 rounded border">
{JSON.stringify(adaptations.cssVariables, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </section>

      {/* =========================================================================
          ECOSYSTEM & ARCHITECTURE CARDS (inspired by Content.tsx & EcosystemBox)
          ========================================================================= */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="flex flex-col gap-10 scroll-mt-20"
      >
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Modular Architecture</span>
          </div>
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Engineered from Core to Primitives
          </h2>
          <p className="text-sm text-muted-foreground">
            Six composable layers designed to let web applications adopt runtime adaptation incrementally
            without vendor lock-in or heavyweight external dependencies.
          </p>
        </div>

        {/* 6 Ecosystem Cards in 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Core Runtime */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Central Runtime Engine
                </h3>
                <span className="text-[11px] font-mono font-semibold text-purple-600 dark:text-purple-400">
                  @tederash/core
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Framework-independent runtime maintaining active preferences, resolving 4-tier precedence
                (Defaults → App → Profile → Component Override), and executing deterministic adaptation rules.
              </p>
            </div>
            <Link
              href="/docs/runtime"
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span>Explore Core Runtime</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Card 2: Adaptive Components */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layout className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Adaptive Primitives
                </h3>
                <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                  @tederash/components
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                9 production-ready accessible components (Button, Input, Form, Checkbox, Select, Dialog, Navigation, Textarea, LiveRegion)
                responding instantly to active profile signals.
              </p>
            </div>
            <Link
              href="/docs/components"
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span>Browse Components</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Card 3: Multimodal Speech & Dictation */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Mic className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Multimodal Speech
                </h3>
                <span className="text-[11px] font-mono font-semibold text-pink-600 dark:text-pink-400">
                  Web Speech APIs
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Native speech synthesis and speech recognition integration. Dictate directly into form fields
                and listen to explanatory instructions with zero third-party cloud lock-in.
              </p>
            </div>
            <Link
              href="/docs/hooks"
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span>View Speech Features</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Card 4: Intelligent Form Assistance */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Brain className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Form Assistance Engine
                </h3>
                <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                  @tederash/assistance
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contextual assistance translating obscure validation errors into plain human language,
                explaining requirements, and orchestrating multi-step guided wizards.
              </p>
            </div>
            <Link
              href="/docs/components"
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span>Explore Form Assistance</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Card 5: Ethiopian Context & Ge'ez */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Globe className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Ge&apos;ez / Amharic Localization
                </h3>
                <span className="text-[11px] font-mono font-semibold text-teal-600 dark:text-teal-400">
                  Built-in i18n
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                First-class Ethiopian localization with native Amharic translation dictionaries, Ge&apos;ez numeral
                support, and font fallbacks optimized for Ethiopian script legibility.
              </p>
            </div>
            <Link
              href="/docs/runtime"
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span>Read Localization Guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Card 6: Developer Audits & DevTools */}
          <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  axe-core Live Auditing
                </h3>
                <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  DevTools Drawer
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Embedded real-time accessibility auditing via axe-core. Inspect WCAG 2.2 AA violations,
                affected DOM elements, and remediation guidance in the live floating dock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                announce({
                  message: "Click the floating accessibility pill in the header to run live audits.",
                  priority: "polite",
                });
              }}
              className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded w-fit"
            >
              <span>Run Live Audit Drawer</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPARISON SECTION (#comparison)
          ========================================================================= */}
      <section
        id="comparison"
        aria-labelledby="comparison-heading"
        className="flex flex-col gap-10 scroll-mt-20"
      >
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Architectural Comparison</span>
          </div>
          <h2 id="comparison-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Why Adaptive Accessibility?
          </h2>
          <p className="text-sm text-muted-foreground">
            See the fundamental difference between legacy surface toolbars and Tederash&apos;s runtime adaptation engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Legacy Overlays */}
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Legacy Accessibility Toolbars</h3>
                <span className="text-xs text-destructive font-medium">Surface Injections &amp; Overlays</span>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs text-muted-foreground" role="list">
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-bold text-sm" aria-hidden="true">✕</span>
                <span>Injects third-party CSS overrides that break site layout and responsiveness.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-bold text-sm" aria-hidden="true">✕</span>
                <span>Blind to keyboard focus order and native assistive technology trees.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-bold text-sm" aria-hidden="true">✕</span>
                <span>Ignores cognitive load: cannot reformat multi-step forms or simplify language.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-bold text-sm" aria-hidden="true">✕</span>
                <span>Forces users to re-configure isolated settings repeatedly across every site.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-bold text-sm" aria-hidden="true">✕</span>
                <span>Often flagged by disability advocates for non-compliance and user alienation.</span>
              </li>
            </ul>
          </div>

          {/* Tederash Runtime */}
          <div className="p-8 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Tederash Adaptive Runtime</h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Runtime Adaptation SDK
                </span>
              </div>
            </div>

            <ul className="space-y-3.5 text-xs text-foreground" role="list">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold text-sm" aria-hidden="true">✓</span>
                <span>Native React component primitives adhering strictly to WAI-ARIA 1.2 patterns.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold text-sm" aria-hidden="true">✓</span>
                <span>Deterministic 4-tier precedence model without CSS specificity wars or layout breakage.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold text-sm" aria-hidden="true">✓</span>
                <span>Active cognitive support: guided multi-step form transformation and simplified instruction.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold text-sm" aria-hidden="true">✓</span>
                <span>Multimodal speech synthesis and voice dictation with zero cloud lock-in.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold text-sm" aria-hidden="true">✓</span>
                <span>100% offline-first architecture with native Amharic and Ge&apos;ez typography.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMMUNITY & SPREAD THE WORD (inspired by Sponsors.tsx)
          ========================================================================= */}
      <section
        id="sponsors"
        aria-labelledby="community-heading"
        className="flex flex-col items-center text-center p-10 rounded-3xl border border-border bg-card/60 backdrop-blur-sm gap-6 max-w-4xl mx-auto"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <Heart className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 id="community-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Advancing Accessible Web for Everyone
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Tederash is an open-source framework dedicated to removing barriers on the web.
            Share it with developers, contribute components, or sponsor ongoing development.
          </p>
        </div>

        {/* Social Share Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share Tederash on X"
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Share on X</span>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share Tederash on LinkedIn"
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Share on LinkedIn</span>
          </a>
          <a
            href={`https://bsky.app/intent/compose?text=${encodedTextWithUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share Tederash on Bluesky"
            className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Share on Bluesky</span>
          </a>
          <a
            href="https://github.com/adrianhajdin/saas-template"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Star on GitHub ★</span>
          </a>
        </div>
      </section>
    </div>
  );
}
