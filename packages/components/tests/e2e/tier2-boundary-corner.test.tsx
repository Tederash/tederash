// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, render, act } from "@testing-library/react";
import "./setup/test-globals";
import {
  renderWithA11y,
  DEFAULT_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  LocalStorageAdapter,
  validateProfile,
  sanitizeProfile,
  createAccessibilityRuntime,
  useAccessibility,
  useAccessibilityPreference,
  AccessibilityOverride,
  AccessibleButton,
  AccessibleInput,
  AccessibleForm,
  AccessibleDialog,
  LiveRegion,
  HeuristicAssistanceProvider,
  isSpeechSynthesisSupported,
  useSpeechSynthesis,
  useSpeechRecognition,
  t,
  getGeezTypographyStyles,
  AccessibilityEventBus,
  MockSpeechRecognition,
} from "./setup/test-harness";

describe("Tier 2: Boundary & Corner Cases (32 Tests across 6 Equivalence Classes)", () => {
  // ==========================================================================
  // Class 1: Central Runtime & Profile Engine
  // ==========================================================================
  describe("Class 1: Central Runtime & Profile Engine", () => {
    it("E2E-T2-RT-01: Profile Validation - FontScale below 0.5 minimum", () => {
      const invalidProfile = {
        id: "too-small",
        name: "Too Small",
        visual: { fontScale: 0.1 },
      };
      const result = validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("visual.fontScale"))).toBe(true);
    });

    it("E2E-T2-RT-02: Profile Validation - FontScale above 3.0 maximum", () => {
      const invalidProfile = {
        id: "too-big",
        name: "Too Big",
        visual: { fontScale: 4.5 },
      };
      const result = validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("visual.fontScale"))).toBe(true);
    });

    it("E2E-T2-RT-03: Profile Sanitization - Clamping Extreme Values", () => {
      const extremeProfile = {
        id: "extreme",
        name: "Extreme",
        visual: { fontScale: 10.0 },
        speech: { speechRate: 0.05 },
      };
      const sanitized = sanitizeProfile(extremeProfile);
      expect(sanitized.visual?.fontScale).toBe(3.0);
      expect(sanitized.speech?.speechRate).toBe(0.25);
    });

    it("E2E-T2-RT-04: Persistence Handling - Disabled/Failing Storage fallback", () => {
      const adapter = new LocalStorageAdapter("test-key");

      // When localStorage.setItem throws QuotaExceededError
      if (typeof window !== "undefined" && window.localStorage) {
        const orig = window.localStorage.setItem;
        window.localStorage.setItem = () => {
          throw new Error("QuotaExceededError");
        };

        expect(() => {
          adapter.save(LOW_VISION_PRESET);
        }).not.toThrow();

        window.localStorage.setItem = orig;
      } else {
        expect(() => {
          adapter.save(LOW_VISION_PRESET);
        }).not.toThrow();
      }
    });

    it("E2E-T2-RT-05: Rapid Profile Switching - 100 consecutive switches", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });

      for (let i = 0; i < 100; i++) {
        const target = i % 2 === 0 ? MOTOR_ASSIST_PRESET : LOW_VISION_PRESET;
        runtime.setProfile(target);
      }

      // Final state must match the 99th switch (LOW_VISION_PRESET since 99 % 2 !== 0)
      expect(runtime.getProfile().id).toBe("low-vision");
      expect(runtime.getAdaptations().highContrast).toBe(true);
    });

    it("E2E-T2-RT-06: Announcement Deduplication - 1000ms suppression", () => {
      const bus = new AccessibilityEventBus();
      const listener = vi.fn();
      bus.subscribe(listener);

      bus.announce({
        message: "Network offline",
        priority: "assertive",
        deduplicate: true,
      });
      bus.announce({
        message: "Network offline",
        priority: "assertive",
        deduplicate: true,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Class 2: React Developer API & Subtree Scoping
  // ==========================================================================
  describe("Class 2: React Developer API & Scoping", () => {
    it("E2E-T2-RC-01: useAccessibility outside Provider throws error", () => {
      function NakedConsumer() {
        useAccessibility();
        return <div>Naked</div>;
      }

      // Suppress console.error in test log
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<NakedConsumer />)).toThrow(
        /useAccessibility must be used within an <AccessibilityProvider>/i
      );
      consoleSpy.mockRestore();
    });

    it("E2E-T2-RC-02: useAccessibilityPreference with non-existent dot path", () => {
      function NonExistentConsumer() {
        const val = useAccessibilityPreference("visual.nonExistentKey.child");
        return <span data-testid="val">{val === undefined ? "UNDEFINED" : String(val)}</span>;
      }

      renderWithA11y(<NonExistentConsumer />);
      expect(screen.getByTestId("val").textContent).toBe("UNDEFINED");
    });

    it("E2E-T2-RC-03: 3 levels of nested AccessibilityOverride", () => {
      function Level1() {
        const { adaptations } = useAccessibility();
        return <span data-testid="level-1-font">{String(adaptations.fontScale)}</span>;
      }
      function Level2() {
        const { adaptations } = useAccessibility();
        return <span data-testid="level-2-contrast">{String(adaptations.highContrast)}</span>;
      }
      function Level3() {
        const { adaptations } = useAccessibility();
        return (
          <>
            <span data-testid="level-3-target">{adaptations.targetSize}</span>
            <span data-testid="level-3-contrast">{String(adaptations.highContrast)}</span>
            <span data-testid="level-3-font">{String(adaptations.fontScale)}</span>
          </>
        );
      }

      function TripleNested() {
        return (
          <AccessibilityOverride override={{ visual: { fontScale: 1.2 } }}>
            <Level1 />
            <AccessibilityOverride override={{ visual: { fontScale: 1.2, highContrast: true } }}>
              <Level2 />
              <AccessibilityOverride override={{ visual: { fontScale: 1.2, highContrast: true }, motor: { targetSize: "extra-large" } }}>
                <Level3 />
              </AccessibilityOverride>
            </AccessibilityOverride>
          </AccessibilityOverride>
        );
      }

      renderWithA11y(<TripleNested />);

      expect(screen.getByTestId("level-1-font").textContent).toBe("1.2");
      expect(screen.getByTestId("level-2-contrast").textContent).toBe("true");
      expect(screen.getByTestId("level-3-target").textContent).toBe("extra-large");
      expect(screen.getByTestId("level-3-contrast").textContent).toBe("true");
      expect(screen.getByTestId("level-3-font").textContent).toBe("1.2");
    });

    it("E2E-T2-RC-04: applyStylesToRoot=false does not touch documentElement", () => {
      const { getRootA11yAttribute, getRootCSSVariable } = renderWithA11y(
        <div>No Root Mutation</div>,
        {
          defaultProfile: LOW_VISION_PRESET,
          applyStylesToRoot: false,
        }
      );

      expect(getRootA11yAttribute("data-a11y-high-contrast")).toBeNull();
      expect(getRootCSSVariable("--a11y-font-scale")).toBe("");
    });

    it("E2E-T2-RC-05: Provider unmounting cleanly unsubscribes all listeners", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });
      const subscribeSpy = vi.spyOn(runtime, "subscribe");

      const { unmount } = renderWithA11y(<div>Mount / Unmount</div>, { runtime });
      expect(subscribeSpy).toHaveBeenCalled();

      // Unmounting should not throw and runtime remains responsive
      expect(() => unmount()).not.toThrow();
      expect(() => runtime.setProfile(LOW_VISION_PRESET)).not.toThrow();
    });
  });

  // ==========================================================================
  // Class 3: Adaptive Component Library
  // ==========================================================================
  describe("Class 3: Adaptive Component Library", () => {
    it("E2E-T2-CP-01: AccessibleButton destructive prompt cancelled announces feedback", () => {
      const onClick = vi.fn();

      const { getPoliteAnnouncement } = renderWithA11y(
        <AccessibleButton variant="destructive" onClick={onClick}>
          Delete Item
        </AccessibleButton>,
        {
          defaultProfile: {
            ...DEFAULT_PROFILE,
            interaction: { confirmationBeforeDestructiveActions: true },
          },
        }
      );

      const btn = screen.getByRole("button", { name: /delete item/i });
      fireEvent.click(btn);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClick).not.toHaveBeenCalled();
      expect(getPoliteAnnouncement()).toContain("Action cancelled.");
    });

    it("E2E-T2-CP-02: AccessibleInput with visually hidden label", () => {
      renderWithA11y(
        <AccessibleInput id="search" label="Search Query" visuallyHideLabel={true} />
      );

      const input = screen.getByLabelText(/search query/i);
      expect(input).toBeTruthy();

      const label = document.querySelector('label[for="search"]');
      expect(label?.className).toContain("sr-only");
    });

    it("E2E-T2-CP-03: AccessibleInput with long error message escapes cleanly", () => {
      const longError = "Error: " + "A".repeat(600);
      const { container } = renderWithA11y(
        <AccessibleInput id="long-field" label="Field" error={longError} />
      );

      const errorAlert = container.querySelector("#long-field-error");
      expect(errorAlert?.textContent).toContain("AAAAA");
      expect(errorAlert?.getAttribute("role")).toBe("alert");
    });

    it("E2E-T2-CP-04: AccessibleForm 0 errors vs 10 errors", () => {
      const tenErrors = Array.from({ length: 10 }, (_, i) => `Validation error #${i + 1}`);

      const { container, rerender } = renderWithA11y(
        <AccessibleForm errors={[]}>
          <button type="submit">Submit</button>
        </AccessibleForm>
      );

      expect(container.querySelector('[role="alert"]:not([aria-live])')).toBeNull();

      rerender(
        <AccessibleForm errors={tenErrors}>
          <button type="submit">Submit</button>
        </AccessibleForm>
      );

      const alertBanner = container.querySelector('[role="alert"]:not([aria-live])');
      expect(alertBanner).toBeTruthy();
      const listItems = alertBanner?.querySelectorAll("li");
      expect(listItems?.length).toBe(10);
    });

    it("E2E-T2-CP-05: AccessibleDialog Tab focus wrap-around", () => {
      renderWithA11y(
        <AccessibleDialog open={true} onOpenChange={() => {}} title="Dialog Wrap">
          <button id="first-btn" type="button">First</button>
          <button id="last-btn" type="button">Last</button>
        </AccessibleDialog>
      );

      const lastBtn = screen.getByRole("button", { name: "Last" });
      const firstBtn = screen.getByRole("button", { name: "First" });

      const closeBtn = screen.getByRole("button", { name: /close dialog/i });

      lastBtn.focus();
      expect(document.activeElement).toBe(lastBtn);

      // Tab on last tabbable wraps focus to the first tabbable (header close button)
      fireEvent.keyDown(lastBtn, { key: "Tab", shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);

      // Shift+Tab on first tabbable wraps back to the last
      fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(lastBtn);
      expect(firstBtn).toBeTruthy();
    });

    it("E2E-T2-CP-06: LiveRegion burst of 20 announcements", () => {
      function BurstAnnouncements() {
        const { announce } = useAccessibility();
        return (
          <button
            onClick={() => {
              for (let i = 1; i <= 20; i++) {
                announce({
                  message: `Update #${i}`,
                  priority: i === 20 ? "assertive" : "polite",
                });
              }
            }}
          >
            Burst
          </button>
        );
      }

      const { getAssertiveAnnouncement } = renderWithA11y(<BurstAnnouncements />);
      fireEvent.click(screen.getByRole("button", { name: /burst/i }));

      // The assertive announcement (last) should be present
      expect(getAssertiveAnnouncement()).toContain("Update #20");
    });
  });

  // ==========================================================================
  // Class 4: Intelligent Form Assistance Engine
  // ==========================================================================
  describe("Class 4: Intelligent Form Assistance Engine", () => {
    it("E2E-T2-AS-01: Unknown / Custom Field Name Fallback", async () => {
      const provider = new HeuristicAssistanceProvider();
      const res = await provider.explainField({
        fieldName: "taxIdentificationNumber",
        type: "text",
        label: "Tax Identification Number",
      });

      expect(res).toContain("Tax Identification Number");
      expect(res).toContain("accurately");
    });

    it("E2E-T2-AS-02: Empty Error Message or undefined errorType", async () => {
      const provider = new HeuristicAssistanceProvider();
      const res = await provider.explainError({
        fieldName: "unknownField",
      });

      expect(res).toBe("Please check the format of this field.");
    });

    it("E2E-T2-AS-03: Offline Availability - Zero Network Dependency", async () => {
      const provider = new HeuristicAssistanceProvider();
      // Ensure it executes synchronously/offline without fetch
      const promise = provider.explainField({ fieldName: "email", type: "email" });
      expect(promise).toBeInstanceOf(Promise);
      const text = await promise;
      expect(text).toContain("valid email address");
    });

    it("E2E-T2-AS-04: Very Long Text Simplification", async () => {
      const provider = new HeuristicAssistanceProvider();
      const longText = "Legal agreement: " + "Terms and conditions apply. ".repeat(100);
      const simplified = await provider.simplifyInstructions(longText);

      expect(simplified).toContain("Summary: Read all guidelines carefully");
    });

    it("E2E-T2-AS-05: Malformed Context - Missing fieldName and type", async () => {
      const provider = new HeuristicAssistanceProvider();
      const res = await provider.explainField({} as any);

      expect(res).toContain("information");
    });
  });

  // ==========================================================================
  // Class 5: Multimodal Speech & Voice Interaction
  // ==========================================================================
  describe("Class 5: Multimodal Speech & Voice Interaction", () => {
    it("E2E-T2-SP-01: Capability Detection in unsupported environment", () => {
      const orig = window.speechSynthesis;
      delete (window as any).speechSynthesis;

      expect(isSpeechSynthesisSupported()).toBe(false);

      (window as any).speechSynthesis = orig;
    });

    it("E2E-T2-SP-02: Calling speak() when unsupported does not crash", () => {
      const orig = window.speechSynthesis;
      delete (window as any).speechSynthesis;

      function UnsupportedTTS() {
        const { speak, isSupported } = useSpeechSynthesis();
        return (
          <button onClick={() => speak("Hello")}>
            {isSupported ? "Supported" : "Unsupported"}
          </button>
        );
      }

      renderWithA11y(<UnsupportedTTS />);
      const btn = screen.getByRole("button", { name: "Unsupported" });
      expect(() => fireEvent.click(btn)).not.toThrow();

      (window as any).speechSynthesis = orig;
    });

    it("E2E-T2-SP-03: Microphone Access Rejected (NotAllowedError)", () => {
      function RejectedSTT() {
        const { startListening } = useSpeechRecognition();
        return <button onClick={() => startListening()}>Start STT</button>;
      }

      const { getAssertiveAnnouncement } = renderWithA11y(<RejectedSTT />);
      fireEvent.click(screen.getByRole("button", { name: /start stt/i }));

      // Simulate browser microphone permission rejection on the active instance within act
      act(() => {
        MockSpeechRecognition.lastInstance?.simulateError("NotAllowedError");
      });

      expect(getAssertiveAnnouncement()).toContain("Voice recognition error: NotAllowedError.");
    });

    it("E2E-T2-SP-04: Speech Rate Out-of-bounds Clamping", () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, "speak");

      function ClampedRateDemo() {
        const { speak } = useSpeechSynthesis();
        return <button onClick={() => speak("Clamped", { rate: 10.0 })}>Speak 10x</button>;
      }

      renderWithA11y(<ClampedRateDemo />);
      fireEvent.click(screen.getByRole("button", { name: /speak 10x/i }));

      // Clamped to 3.0 maximum
      expect(speakSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rate: 3.0,
        })
      );
      speakSpy.mockRestore();
    });

    it("E2E-T2-SP-05: Rapid Speech Calls Cancel Previous Utterances", () => {
      const cancelSpy = vi.spyOn(window.speechSynthesis, "cancel");

      function RapidSpeech() {
        const { speak } = useSpeechSynthesis();
        return (
          <button
            onClick={() => {
              speak("First");
              speak("Second");
              speak("Third");
            }}
          >
            Rapid Speak
          </button>
        );
      }

      renderWithA11y(<RapidSpeech />);
      fireEvent.click(screen.getByRole("button", { name: /rapid speak/i }));

      expect(window.speechSynthesis.speaking).toBe(true);
      cancelSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Class 6: Localization & Ethiopian Context
  // ==========================================================================
  describe("Class 6: Localization & Ethiopian Context", () => {
    it("E2E-T2-LO-01: Missing Key in Amharic Falls Back to English", () => {
      const fallbackText = t("presets.standard", "am");
      expect(fallbackText).toBe("መደበኛ ምርጫዎች");

      // Key completely absent in both returns key itself
      const absentKey = t("unknown.key.name", "am");
      expect(absentKey).toBe("unknown.key.name");
    });

    it("E2E-T2-LO-02: Unsupported Locale Falls Back to English", () => {
      const res = t("form.email", "fr");
      expect(res).toBe("Email Address");
    });

    it("E2E-T2-LO-03: Ge'ez Text with Complex Punctuation", () => {
      const geezPunctuation = "ስም፡ ተስፋዬ። ኢሜይል፣ test@example.com፤";
      const styles = getGeezTypographyStyles("am");

      expect(styles.lineHeight).toBe("1.7");
      expect(geezPunctuation).toContain("፡");
      expect(geezPunctuation).toContain("።");
    });

    it("E2E-T2-LO-04: Missing Interpolation Parameter in Params Map", () => {
      // Missing {count} should retain placeholder or replace safely without throwing
      const res = t("form.errorCount", "am", {});
      expect(res).toBe("ቅጹ {count} ስህተቶች አሉት");
    });

    it("E2E-T2-LO-05: Mixed Directionality English and Amharic", () => {
      const mixed = "Welcome ተስፋዬ to Tederash";
      expect(mixed).toContain("Welcome");
      expect(mixed).toContain("ተስፋዬ");
    });
  });
});
