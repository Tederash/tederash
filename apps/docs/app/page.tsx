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
  ArrowRight,
  ShieldCheck,
  Layers,
  Layout,
  Mic,
  Brain,
  Globe,
  Sliders,
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
  } = useSpeechRecognition();

  // Multi-step form state
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = React.useState<string[]>([]);
  const [submittedSuccess, setSubmittedSuccess] = React.useState(false);
  const [dictationTarget, setDictationTarget] = React.useState<
    keyof typeof formData | null
  >(null);

  // Guided mode adapts step wizard structure
  const guided = adaptations.guidedInteraction;
  const totalSteps = guided ? 3 : 1;

  const stepTitles = [
    t("labels.personalInfo"),
    t("labels.credentials"),
    t("labels.review"),
  ];

  const stepFields: Array<Array<keyof typeof formData>> = [
    ["fullName"],
    ["email", "password"],
    [],
  ];

  // Speech dictation binding
  React.useEffect(() => {
    if (transcript && dictationTarget) {
      setFormData((prev) => ({
        ...prev,
        [dictationTarget]: prev[dictationTarget]
          ? `${prev[dictationTarget]} ${transcript}`.trim()
          : transcript,
      }));
    }
  }, [transcript, dictationTarget]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      category: "navigation",
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
      category: "navigation",
    });
  };

  const handleReset = () => {
    setFormData({ fullName: "", email: "", password: "" });
    setFormErrors([]);
    setSubmittedSuccess(false);
    setStep(0);
    announce({
      message: t("announcements.formReset"),
      priority: "polite",
      category: "info",
    });
  };

  const handleReadInstructions = () => {
    if (!speechSupported) return;
    if (isSpeaking) {
      cancel();
      return;
    }
    const currentInstructions =
      step === 0
        ? `${t("labels.fullName")}: ${t("instructions.fullName")}`
        : step === 1
          ? `${t("labels.email")}: ${t("instructions.email")}. ${t("labels.password")}: ${t("instructions.password")}`
          : t("instructions.review");

    speak(currentInstructions, {
      lang: profile.speech?.language ?? (locale === "am" ? "am-ET" : "en-US"),
      rate: profile.speech?.speechRate ?? 1,
    });
  };

  const startDictation = (field: keyof typeof formData) => {
    if (!recognitionSupported) return;
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
        <span aria-hidden="true">{active ? "Stop" : "Dictate"}</span>
        <span>{fieldLabel}</span>
      </button>
    );
  };

  const renderInterimTranscript = (field: keyof typeof formData) =>
    isListening && dictationTarget === field && interimTranscript ? (
      <p aria-live="polite" className="text-xs text-muted-foreground mt-1">
        {interimTranscript}
      </p>
    ) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-20">
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <HeroIsometricShowcase />

      {/* =========================================================================
          INTERACTIVE DEMO SECTION (#demo)
          ========================================================================= */}
      <section
        id="demo"
        aria-labelledby="demo-heading"
        className="flex flex-col gap-6 scroll-mt-20 border-t border-border pt-12"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1.5">
            <h2 id="demo-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Interactive form and runtime inspector
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Switch between accessibility profiles below to see how the exact same form controls
              adjust their geometry, contrast tokens, audio feedback, and step guidance without page reload.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium px-3 py-1.5 rounded-md bg-muted border border-border">
            <span className="text-muted-foreground">Active profile:</span>
            <span className="text-foreground font-semibold">{profile.name}</span>
          </div>
        </div>

        {/* Profile Switcher Grid */}
        <section
          aria-labelledby="profiles-heading"
          className="p-4 rounded-xl border border-border bg-card flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <h3 id="profiles-heading" className="text-xs font-semibold text-foreground">
              Select an accessibility profile:
            </h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updates active runtime preferences immediately
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {PRESET_PROFILES.map((p) => {
              const isActive = profile.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProfile(p);
                    announce({
                      message: `Activated ${p.name} profile.`,
                      priority: "polite",
                    });
                  }}
                  aria-pressed={isActive}
                  className={`flex flex-col p-2.5 rounded-lg border text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground font-semibold"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-xs font-medium">{p.name}</span>
                  <span
                    className={`text-[11px] line-clamp-1 mt-0.5 ${
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

        {/* Main Demo Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Adaptive Registration Form */}
          <section
            aria-labelledby="form-heading"
            className="lg:col-span-7 flex flex-col gap-5 p-6 rounded-xl border border-border bg-card"
          >
            <div className="border-b border-border pb-4">
              <h3 id="form-heading" className="text-lg font-bold text-foreground">
                Registration Form
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Demonstrates form validation feedback, touch target sizing, cognitive
                instruction adaptations, guided step flow, voice dictation,
                and Ge&apos;ez localization.
              </p>
              {adaptations.speechOutputEnabled && speechSupported && (
                <button
                  type="button"
                  onClick={handleReadInstructions}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium min-h-[36px]"
                >
                  <Volume2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>{isSpeaking ? "Stop reading" : "Read instructions aloud"}</span>
                </button>
              )}
            </div>

            {submittedSuccess ? (
              <div
                role="status"
                className="p-5 rounded-lg border border-primary/30 bg-primary/5 text-foreground flex flex-col gap-3"
              >
                <h4 className="text-base font-semibold flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span>Registration submitted successfully</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Account recorded for <strong>{formData.fullName}</strong> ({formData.email}).
                  A polite screen reader announcement was emitted automatically.
                </p>
                <AccessibleButton
                  variant="outline"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setStep(0);
                  }}
                  className="w-fit text-xs mt-1"
                >
                  Register another user
                </AccessibleButton>
              </div>
            ) : (
              <AccessibleForm
                errors={formErrors}
                onSubmit={handleSubmit}
                successAnnouncement={t("announcements.formSubmitted")}
              >
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
                    <div className="flex gap-1.5" aria-hidden="true">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-sm transition-colors ${
                            i <= step ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 0: Personal Info */}
                {(!guided || step === 0) && (
                  <div className="flex flex-col gap-1">
                    <AccessibleInput
                      label={t("labels.fullName")}
                      description={
                        adaptations.showInstructions
                          ? t("instructions.fullName")
                          : undefined
                      }
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                      required
                      autoComplete="name"
                      placeholder={
                        adaptations.showInstructions
                          ? "e.g., Almaz Kebede"
                          : undefined
                      }
                    />
                    {renderDictationButton("fullName", t("labels.fullName"))}
                    {renderInterimTranscript("fullName")}
                  </div>
                )}

                {/* Step 1: Credentials */}
                {(!guided || step === 1) && (
                  <>
                    <div className="flex flex-col gap-1">
                      <AccessibleInput
                        label={t("labels.email")}
                        type="email"
                        description={
                          adaptations.showInstructions
                            ? t("instructions.email")
                            : undefined
                        }
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                      {renderDictationButton("email", t("labels.email"))}
                      {renderInterimTranscript("email")}
                    </div>

                    <div className="flex flex-col gap-1">
                      <AccessibleInput
                        label={t("labels.password")}
                        type="password"
                        description={
                          adaptations.showInstructions
                            ? t("instructions.password")
                            : undefined
                        }
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        required
                        autoComplete="new-password"
                      />
                      {renderDictationButton("password", t("labels.password"))}
                      {renderInterimTranscript("password")}
                    </div>
                  </>
                )}

                {/* Step 2: Review (Guided mode) */}
                {guided && step === 2 && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border flex flex-col gap-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("labels.review")}
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t("labels.fullName")}</dt>
                        <dd className="font-medium text-foreground">{formData.fullName || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("labels.email")}</dt>
                        <dd className="font-medium text-foreground">{formData.email || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("labels.password")}</dt>
                        <dd className="font-medium text-foreground">
                          {formData.password ? "Provided (hidden)" : "Not set"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Step Navigation & Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border">
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
            className="lg:col-span-5 flex flex-col gap-4 p-6 rounded-xl border border-border bg-card"
          >
            <div>
              <h3 id="inspector-heading" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Runtime state inspector</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current adaptations applied directly to the document root through CSS variables and data attributes.
              </p>
            </div>

            <div className="divide-y divide-border text-xs">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Active profile:</span>
                <span className="font-semibold text-foreground">{profile.name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Locale:</span>
                <span className="font-mono font-medium text-foreground">
                  {locale} ({locale === "am" ? "Amharic" : "English"})
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Font scale:</span>
                <span className="font-mono font-medium text-foreground">
                  {(adaptations.fontScale * 100).toFixed(0)}% ({adaptations.fontScale}x)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Target height:</span>
                <span className="font-mono font-medium text-foreground">{adaptations.minTargetHeight}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Focus indicator:</span>
                <span className="font-medium text-foreground capitalize">{adaptations.focusIndicator}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">High contrast:</span>
                <span className="font-medium text-foreground">{adaptations.highContrast ? "Enabled" : "Default"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Underline links:</span>
                <span className="font-medium text-foreground">{adaptations.underlineLinks ? "Enabled" : "Default"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Cognitive assistance:</span>
                <span className="font-medium text-foreground">{adaptations.simplifiedLanguage ? "Active" : "Standard"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Destructive confirmation:</span>
                <span className="font-medium text-foreground">{adaptations.confirmationBeforeDestructiveActions ? "Required" : "Optional"}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg mt-1 border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                Resolved CSS Custom Properties:
              </div>
              <pre className="text-[10px] font-mono overflow-x-auto p-2 bg-background rounded border border-border">
{JSON.stringify(adaptations.cssVariables, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      </section>

      {/* =========================================================================
          ARCHITECTURE & PACKAGES SECTION (#features)
          ========================================================================= */}
      <section
        id="features"
        aria-labelledby="features-heading"
        className="flex flex-col gap-8 scroll-mt-20 border-t border-border pt-12"
      >
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <h2 id="features-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Six composable framework layers
          </h2>
          <p className="text-sm text-muted-foreground">
            Modular architecture designed to let React applications adopt runtime adaptation incrementally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Central Runtime Engine</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">@tederash/core</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Framework-independent runtime holding profile state, resolving 4-tier precedence
                (Defaults, App, Profile, Component Override), and executing deterministic adaptation rules.
              </p>
            </div>
            <Link
              href="/docs/runtime"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Runtime documentation</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Adaptive Primitives</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">@tederash/components</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Production-ready accessible components (Button, Input, Form, Checkbox, Select, Dialog, Navigation, Textarea, LiveRegion)
                that adapt to active profile signals.
              </p>
            </div>
            <Link
              href="/docs/components"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Component documentation</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Multimodal Speech</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Web Speech APIs</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Browser-native speech synthesis and speech recognition integration. Dictate directly into form fields
                and hear spoken explanations without remote third-party cloud lock-in.
              </p>
            </div>
            <Link
              href="/docs/hooks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Speech hooks reference</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Form Assistance Engine</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">@tederash/assistance</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pluggable assistance provider abstraction that explains field requirements in plain language
                and clarifies validation errors before submission.
              </p>
            </div>
            <Link
              href="/docs/components"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Form assistance guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">Ge&apos;ez / Amharic Localization</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Built-in i18n</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ethiopian language localization including Amharic translation dictionaries, Ge&apos;ez numerals,
                and typography font fallbacks optimized for Ethiopian script legibility.
              </p>
            </div>
            <Link
              href="/docs/runtime"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Localization documentation</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">axe-core Audit Integration</h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">DevTools Drawer</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Client-side accessibility auditing powered by axe-core. Inspect WCAG 2.2 AA conformance
                and violation details in the slide-out control drawer.
              </p>
            </div>
            <Link
              href="/docs/quick-start"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Quick start guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ARCHITECTURAL COMPARISON SECTION (#comparison)
          ========================================================================= */}
      <section
        id="comparison"
        aria-labelledby="comparison-heading"
        className="flex flex-col gap-6 scroll-mt-20 border-t border-border pt-12 pb-12"
      >
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <h2 id="comparison-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Runtime adaptation compared to overlay toolbars
          </h2>
          <p className="text-sm text-muted-foreground">
            Why accessibility must live inside the component tree rather than as a third-party DOM overlay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground">Third-Party Overlay Toolbars</h3>
            </div>
            <ul className="space-y-3 text-xs text-muted-foreground" role="list">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-mono" aria-hidden="true">1.</span>
                <span>Injects foreign CSS rules into the page, frequently breaking layout and responsiveness.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-mono" aria-hidden="true">2.</span>
                <span>Cannot modify component semantics, ARIA attributes, or keyboard focus managers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-mono" aria-hidden="true">3.</span>
                <span>Unable to simplify form validation errors or orchestrate guided step-by-step assistance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-mono" aria-hidden="true">4.</span>
                <span>Requires users to reconfigure settings on every new website they visit.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-xl border border-primary/40 bg-card flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground">Tederash Adaptive Runtime</h3>
            </div>
            <ul className="space-y-3 text-xs text-foreground" role="list">
              <li className="flex items-start gap-2">
                <span className="text-primary font-mono font-semibold" aria-hidden="true">1.</span>
                <span>Native React components adhering directly to WAI-ARIA 1.2 authoring patterns.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-mono font-semibold" aria-hidden="true">2.</span>
                <span>Predictable 4-tier precedence without layout conflicts or CSS specificity battles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-mono font-semibold" aria-hidden="true">3.</span>
                <span>Cognitive assistance: automatic multi-step form transformation and simplified instruction.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-mono font-semibold" aria-hidden="true">4.</span>
                <span>Integrated Web Speech APIs for direct field dictation and text-to-speech.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
