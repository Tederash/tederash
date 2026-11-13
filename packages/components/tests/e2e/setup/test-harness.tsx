// @vitest-environment jsdom
import * as React from "react";
import { render, RenderResult } from "@testing-library/react";
import {
  MockSpeechSynthesis,
  MockSpeechSynthesisUtterance,
  MockSpeechRecognition,
} from "./test-globals";

export {
  MockSpeechSynthesis,
  MockSpeechSynthesisUtterance,
  MockSpeechRecognition,
};
import {
  AccessibilityProfile,
  DEFAULT_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  COGNITIVE_ASSIST_PRESET,
  REDUCED_MOTION_PRESET,
  KEYBOARD_FIRST_PRESET,
  PRESET_PROFILES,
  validateProfile,
  sanitizeProfile,
  deepMerge,
  resolveProfile,
  resolveAdaptations,
  createAccessibilityRuntime,
  AccessibilityRuntime,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  AccessibilityEventBus,
  Announcement,
  AnnouncementOptions,
  AnnouncementPriority,
  ComponentAdaptations,
} from "@tederash/core";
import {
  AccessibilityProvider,
  AccessibilityOverride,
  AccessibilityContext,
  useAccessibility,
  useAccessibilityPreference,
  useAdaptations,
  useAnnounce,
  useLiveAnnouncements,
} from "@tederash/react";
import {
  AccessibleButton,
  type AccessibleButtonProps,
  AccessibleInput,
  type AccessibleInputProps,
  AccessibleForm,
  type AccessibleFormProps,
  LiveRegion,
  type LiveRegionProps,
  AccessibleCheckbox,
  type AccessibleCheckboxProps,
  AccessibleSelect,
  type AccessibleSelectProps,
  type AccessibleSelectOption,
  AccessibleDialog,
  type AccessibleDialogProps,
  AccessibleNavigation,
  type AccessibleNavigationProps,
  type AccessibleNavigationLink,
  AccessibleTextarea,
  type AccessibleTextareaProps,
} from "../../../src";

// Re-export core, react, and components for convenient opaque-box testing
export {
  type AccessibilityProfile,
  DEFAULT_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  COGNITIVE_ASSIST_PRESET,
  REDUCED_MOTION_PRESET,
  KEYBOARD_FIRST_PRESET,
  PRESET_PROFILES,
  validateProfile,
  sanitizeProfile,
  deepMerge,
  resolveProfile,
  resolveAdaptations,
  createAccessibilityRuntime,
  type AccessibilityRuntime,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  AccessibilityEventBus,
  type Announcement,
  type AnnouncementOptions,
  type AnnouncementPriority,
  type ComponentAdaptations,
  AccessibilityProvider,
  AccessibilityOverride,
  AccessibilityContext,
  useAccessibility,
  useAccessibilityPreference,
  useAdaptations,
  useAnnounce,
  useLiveAnnouncements,
  AccessibleButton,
  type AccessibleButtonProps,
  AccessibleInput,
  type AccessibleInputProps,
  AccessibleForm,
  type AccessibleFormProps,
  LiveRegion,
  type LiveRegionProps,
  AccessibleCheckbox,
  type AccessibleCheckboxProps,
  AccessibleSelect,
  type AccessibleSelectProps,
  type AccessibleSelectOption,
  AccessibleDialog,
  type AccessibleDialogProps,
  AccessibleNavigation,
  type AccessibleNavigationProps,
  type AccessibleNavigationLink,
  AccessibleTextarea,
  type AccessibleTextareaProps,
};

// ============================================================================
// 1. Test Harness Wrapper & Render Utilities
// ============================================================================

export interface TestHarnessOptions {
  defaultProfile?: AccessibilityProfile;
  appDefaults?: Partial<AccessibilityProfile>;
  runtime?: AccessibilityRuntime;
  persistence?: "memory" | "local" | "none";
  storageKey?: string;
  applyStylesToRoot?: boolean;
  showVisualBanner?: boolean;
}

export interface RenderWithA11yResult extends RenderResult {
  getRootA11yAttribute: (attrName: string) => string | null;
  getRootCSSVariable: (varName: string) => string;
  getPoliteAnnouncement: () => string;
  getAssertiveAnnouncement: () => string;
}

export function renderWithA11y(
  ui: React.ReactElement,
  options: TestHarnessOptions = {}
): RenderWithA11yResult {
  const {
    defaultProfile = DEFAULT_PROFILE,
    appDefaults,
    runtime,
    persistence = "none",
    storageKey,
    applyStylesToRoot = true,
    showVisualBanner = true,
  } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AccessibilityProvider
        defaultProfile={defaultProfile}
        appDefaults={appDefaults}
        runtime={runtime}
        persistence={persistence}
        storageKey={storageKey}
        applyStylesToRoot={applyStylesToRoot}
      >
        <LiveRegion showVisualBanner={showVisualBanner} />
        {children}
      </AccessibilityProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper });

  return {
    ...result,
    getRootA11yAttribute: (attrName: string) => {
      return document.documentElement.getAttribute(attrName);
    },
    getRootCSSVariable: (varName: string) => {
      return document.documentElement.style.getPropertyValue(varName);
    },
    getPoliteAnnouncement: () => {
      const politeEl = document.querySelector('[aria-live="polite"]');
      return politeEl?.textContent || "";
    },
    getAssertiveAnnouncement: () => {
      const assertiveEl = document.querySelector('[aria-live="assertive"]');
      return assertiveEl?.textContent || "";
    },
  };
}

// ============================================================================
// 2. Adaptive Component Primitives for Monorepo Roadmap (M2)
// AccessibleCheckbox, AccessibleSelect, AccessibleDialog, AccessibleNavigation,
// and AccessibleTextarea are now imported directly from @tederash/components (../../../src)
// ============================================================================

// ============================================================================
// 3. Intelligent Form Assistance Engine (M3 Roadmap Contract)
// ============================================================================

export interface FieldContext {
  fieldName: string;
  type?: string;
  required?: boolean;
  value?: string;
  label?: string;
}

export interface ErrorContext {
  fieldName: string;
  errorType?: "valueMissing" | "patternMismatch" | "typeMismatch" | "tooShort" | string;
  rawMessage?: string;
}

export interface AssistanceProvider {
  id: string;
  name: string;
  explainField(context: FieldContext): Promise<string>;
  explainError(context: ErrorContext): Promise<string>;
  simplifyInstructions(text: string, context?: { locale?: string }): Promise<string>;
}

export class HeuristicAssistanceProvider implements AssistanceProvider {
  id = "heuristic";
  name = "Offline Deterministic Assistance";

  async explainField(context: FieldContext): Promise<string> {
    const name = (context.fieldName || "").toLowerCase();
    const type = (context.type || "").toLowerCase();

    if (name.includes("email") || type === "email") {
      return "Please enter a valid email address with an @ symbol and a domain (e.g. name@example.com).";
    }
    if (name.includes("password") || type === "password") {
      return "Create a secure password with at least 8 characters, including upper and lower case letters, numbers, and symbols.";
    }
    if (name.includes("phone") || type === "tel") {
      return "Enter your complete phone number including your area code (e.g. 555-123-4567).";
    }
    return `Please enter your ${context.label || context.fieldName || "information"} accurately to complete this step.`;
  }

  async explainError(context: ErrorContext): Promise<string> {
    const name = context.fieldName || "This field";
    const type = context.errorType || "";

    if (type === "valueMissing") {
      return `${name} is required to continue. Please provide a value.`;
    }
    if (type === "patternMismatch") {
      return `${name} does not match the required format. Please verify the rules above and try again.`;
    }
    if (type === "typeMismatch") {
      return `The value entered in ${name} is invalid. Please check the expected format.`;
    }
    if (type === "tooShort") {
      return `${name} is too short. Please provide additional characters.`;
    }
    return context.rawMessage || "Please check the format of this field.";
  }

  async simplifyInstructions(text: string): Promise<string> {
    if (!text) return "";
    if (text.length > 500) {
      return "Summary: Read all guidelines carefully and complete each required field to submit.";
    }
    return text
      .replace(/Failure to adhere to terms shall result in immediate account termination\./gi, "You must follow the rules or your account will be closed.")
      .replace(/mandatory/gi, "required")
      .replace(/utilize/gi, "use")
      .trim();
  }
}

export class AssistanceManager {
  private providers = new Map<string, AssistanceProvider>();
  private defaultProvider: AssistanceProvider;
  private cache = new Map<string, string>();

  constructor(defaultProvider?: AssistanceProvider) {
    this.defaultProvider = defaultProvider || new HeuristicAssistanceProvider();
    this.registerProvider(this.defaultProvider);
  }

  registerProvider(provider: AssistanceProvider) {
    this.providers.set(provider.id, provider);
  }

  async explainField(context: FieldContext, providerId?: string): Promise<string> {
    const key = `field:${context.fieldName}:${context.type}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;
    try {
      const res = await provider.explainField(context);
      this.cache.set(key, res);
      return res;
    } catch {
      return this.defaultProvider.explainField(context);
    }
  }

  async explainError(context: ErrorContext, providerId?: string): Promise<string> {
    const key = `error:${context.fieldName}:${context.errorType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;
    try {
      const res = await provider.explainError(context);
      this.cache.set(key, res);
      return res;
    } catch {
      return this.defaultProvider.explainError(context);
    }
  }

  async simplifyInstructions(text: string, providerId?: string): Promise<string> {
    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;
    try {
      return await provider.simplifyInstructions(text);
    } catch {
      return this.defaultProvider.simplifyInstructions(text);
    }
  }
}

// ============================================================================
// 4. Multimodal Speech & Voice Interaction (M4 Roadmap Contract)
// ============================================================================

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechSynthesis() {
  const { profile } = useAccessibility();
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const isSupported = isSpeechSynthesisSupported();

  const speak = React.useCallback(
    (text: string, options: SpeechOptions = {}) => {
      if (!isSupported) return;

      const profileRate = profile.speech?.speechRate ?? 1.0;
      const rate = options.rate !== undefined ? options.rate : profileRate;
      const clampedRate = Math.min(3.0, Math.max(0.25, rate));

      const utterance = new (window as any).SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || profile.speech?.language || "en-US";
      utterance.rate = clampedRate;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, profile.speech]
  );

  const stop = React.useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}

export function useSpeechRecognition() {
  const announce = useAnnounce();
  const [transcript, setTranscript] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);
  const isSupported = isSpeechRecognitionSupported();

  const startListening = React.useCallback(
    (options: { lang?: string } = {}) => {
      if (!isSupported) {
        announce({
          message: "Voice dictation is not supported in this browser.",
          priority: "polite",
        });
        return;
      }

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.lang = options.lang || "en-US";

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e: any) => {
        setIsListening(false);
        announce({
          message: `Voice recognition error: ${e.error || "access denied"}.`,
          priority: "assertive",
        });
      };
      rec.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript || "";
        setTranscript(text);
      };

      recognitionRef.current = rec;
      rec.start();
    },
    [isSupported, announce]
  );

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { startListening, stopListening, transcript, setTranscript, isListening, isSupported };
}

// ============================================================================
// 5. Localization & Ethiopian Context (M5 Roadmap Contract)
// ============================================================================

export const AMHARIC_PRESET: AccessibilityProfile = {
  id: "amharic",
  name: "የአማርኛ ተደራሽነት",
  description: "Amharic accessibility with Ge'ez typography and line-height compensation",
  visual: {
    fontScale: 1.15,
    highContrast: true,
  },
  motor: {
    targetSize: "large",
  },
  speech: {
    speechOutput: true,
    speechInput: true,
    language: "am-ET",
    speechRate: 1.0,
  },
};

export const EN_DICTIONARY: Record<string, string> = {
  "presets.standard": "Standard Defaults",
  "presets.lowVision": "Low Vision & High Contrast",
  "presets.motorAssist": "Motor Assistance & Large Targets",
  "presets.cognitiveAssist": "Cognitive Assistance & Simplified",
  "presets.amharic": "Amharic Accessibility",
  "form.fullName": "Full Name",
  "form.email": "Email Address",
  "form.password": "Password",
  "form.phone": "Phone Number",
  "form.submit": "Submit Application",
  "form.save": "Save Settings",
  "form.cancel": "Cancel",
  "form.fieldRequired": "This field is required",
  "form.errorCount": "The form has {count} errors. Please correct them.",
  "announcements.profileActivated": "Activated {name} accessibility profile.",
  "announcements.formSaved": "Your registration has been saved successfully.",
  "announcements.actionCancelled": "Action cancelled.",
};

export const AM_DICTIONARY: Record<string, string> = {
  "presets.standard": "መደበኛ ምርጫዎች",
  "presets.lowVision": "ዝቅተኛ የማየት ችሎታ እና ከፍተኛ ንፅፅር",
  "presets.motorAssist": "የእንቅስቃሴ እርዳታ እና ትላልቅ አዝራሮች",
  "presets.cognitiveAssist": "የግንዛቤ እርዳታ እና ቀላል ቋንቋ",
  "presets.amharic": "የአማርኛ ተደራሽነት",
  "form.fullName": "ሙሉ ስም",
  "form.email": "ኢሜይል",
  "form.password": "የይለፍ ቃል",
  "form.phone": "ስልክ ቁጥር",
  "form.submit": "ይመዝገቡ",
  "form.save": "ቅንብሮችን አስቀምጥ",
  "form.cancel": "ሰርዝ",
  "form.fieldRequired": "እባክዎ ይህንን መስክ ይሙሉ",
  "form.errorCount": "ቅጹ {count} ስህተቶች አሉት",
  "announcements.profileActivated": "የ{name} ተደራሽነት መገለጫ ነቅቷል።",
  "announcements.formSaved": "ምዝገባዎ በተሳካ ሁኔታ ተቀምጧል።",
  "announcements.actionCancelled": "ድርጊቱ ተሰርዟል።",
};

export function t(key: string, locale = "en", params?: Record<string, string>): string {
  const dict = locale === "am" ? AM_DICTIONARY : EN_DICTIONARY;
  let text = dict[key] || EN_DICTIONARY[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return text;
}

export function getGeezTypographyStyles(locale: string) {
  if (locale === "am") {
    return {
      fontFamily: "'Abyssinica SIL', 'Nyala', sans-serif",
      lineHeight: "1.7",
    };
  }
  return {
    fontFamily: "inherit",
    lineHeight: "inherit",
  };
}

export function useLocale(initialLocale = "en") {
  const [locale, setLocale] = React.useState(initialLocale);

  const translate = React.useCallback(
    (key: string, params?: Record<string, string>) => t(key, locale, params),
    [locale]
  );

  const typography = React.useMemo(() => getGeezTypographyStyles(locale), [locale]);

  return {
    locale,
    setLocale,
    t: translate,
    typography,
    dir: "ltr",
  };
}
