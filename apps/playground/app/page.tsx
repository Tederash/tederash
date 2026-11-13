"use client";

import * as React from "react";
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

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Hero Header */}
      <section className="flex flex-col gap-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold w-fit mx-auto sm:mx-0">
          <span>🚀</span> Adaptive Accessibility Framework MVP
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Runtime-Adaptive Accessibility Demo
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
          Observe how the exact same registration form and UI components dynamically adapt their
          dimensions, contrast, focus rings, and explanatory instructions in real-time without
          re-rendering from scratch or rewriting component logic.
        </p>
      </section>

      {/* Preset Profile Switcher Bar */}
      <section
        aria-labelledby="profiles-heading"
        className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h2 id="profiles-heading" className="text-base font-bold">
            Select an Accessibility Profile:
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Active: <strong>{profile.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
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
                <span className="text-xs">{p.name}</span>
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
          className="lg:col-span-7 flex flex-col gap-4 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="border-b pb-4">
            <h2 id="form-heading" className="text-xl font-bold">
              Adaptive Registration Form
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Demonstrates form validation feedback, target sizing, cognitive
              instruction adaptations, guided multi-step flow, voice dictation,
              and Amharic (Ge'ez) localization.
            </p>
            {adaptations.speechOutputEnabled && speechSupported && (
              <button
                type="button"
                onClick={handleReadInstructions}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium min-h-[40px]"
              >
                <span aria-hidden="true">{isSpeaking ? "⏹" : "🔊"}</span>
                {isSpeaking ? "Stop reading" : "Read field instructions aloud"}
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
              <h3 className="text-lg font-bold">🎉 Registration Successful!</h3>
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
              )}

              {/* Speech recognition status (only when voice input is enabled) */}
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

              {/* Fields: guided wizard shows only the current step's fields */}
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

              {/* Guided mode: review step summary */}
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

              {/* Actions: guided wizard navigates steps; single-step submits directly */}
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
          <h2 id="inspector-heading" className="text-base font-bold flex items-center gap-2">
            <span>🔍</span> Active Runtime Inspector
          </h2>
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
    </main>
  );
}
