// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import "./setup/test-globals";
import {
  renderWithA11y,
  DEFAULT_PROFILE,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
  COGNITIVE_ASSIST_PRESET,
  AMHARIC_PRESET,
  createAccessibilityRuntime,
  resolveProfile,
  useAccessibility,
  useAccessibilityPreference,
  useLiveAnnouncements,
  AccessibilityOverride,
  AccessibleButton,
  AccessibleInput,
  AccessibleForm,
  AccessibleCheckbox,
  AccessibleSelect,
  AccessibleDialog,
  AccessibleNavigation,
  AccessibleTextarea,
  HeuristicAssistanceProvider,
  AssistanceManager,
  isSpeechSynthesisSupported,
  useSpeechSynthesis,
  useSpeechRecognition,
  t,
  useLocale,
  getGeezTypographyStyles,
} from "./setup/test-harness";

describe("Tier 1: Feature Coverage (36 Happy-Path Tests across 6 Equivalence Classes)", () => {
  // ==========================================================================
  // Class 1: Central Runtime & Profile Engine (@tederash/core)
  // ==========================================================================
  describe("Class 1: Central Runtime & Profile Engine", () => {
    it("E2E-T1-RT-01: Built-in Presets Initialization", () => {
      const runtime = createAccessibilityRuntime({
        defaultProfile: DEFAULT_PROFILE,
        persistence: "none",
      });

      const profile = runtime.getProfile();
      const adaptations = runtime.getAdaptations();

      expect(profile.id).toBe("standard");
      expect(profile.name).toBe("Standard");
      expect(adaptations.fontScale).toBe(1.0);
      expect(adaptations.targetSize).toBe("normal");
      expect(adaptations.minTargetHeight).toBe("40px");
    });

    it("E2E-T1-RT-02: Dynamic Profile Switching", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });
      const listener = vi.fn();
      runtime.subscribe(listener);

      runtime.setProfile(LOW_VISION_PRESET);

      expect(listener).toHaveBeenCalled();
      const active = runtime.getProfile();
      const adaptations = runtime.getAdaptations();
      expect(active.id).toBe("low-vision");
      expect(adaptations.fontScale).toBe(1.35);
      expect(adaptations.highContrast).toBe(true);
      expect(adaptations.targetSize).toBe("large");
    });

    it("E2E-T1-RT-03: Deep Preference Update", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });

      runtime.updatePreferences({
        visual: { fontScale: 1.5, highContrast: true },
      });

      const profile = runtime.getProfile();
      const adaptations = runtime.getAdaptations();
      expect(profile.id).toBe("standard"); // Preserves current profile identity
      expect(profile.visual?.fontScale).toBe(1.5);
      expect(adaptations.fontScale).toBe(1.5);
      expect(adaptations.highContrast).toBe(true);
      expect(adaptations.cssVariables["--a11y-font-scale"]).toBe("1.5");
    });

    it("E2E-T1-RT-04: Profile Reset to Defaults", () => {
      const runtime = createAccessibilityRuntime({
        defaultProfile: DEFAULT_PROFILE,
        persistence: "none",
      });

      runtime.setProfile(MOTOR_ASSIST_PRESET);
      expect(runtime.getProfile().id).toBe("motor-assist");
      expect(runtime.getAdaptations().minTargetHeight).toBe("56px");

      runtime.resetProfile();
      expect(runtime.getProfile().id).toBe("standard");
      expect(runtime.getAdaptations().targetSize).toBe("normal");
      expect(runtime.getAdaptations().minTargetHeight).toBe("40px");
    });

    it("E2E-T1-RT-05: 4-Tier Precedence Resolution", () => {
      const frameworkDefault = DEFAULT_PROFILE;
      const appDefaults = { visual: { fontScale: 1.15 } };
      const activeProfile = { ...DEFAULT_PROFILE, visual: { fontScale: 1.3, highContrast: false } };
      const componentOverride = { visual: { fontScale: 1.6 } };

      const resolved = resolveProfile(
        frameworkDefault,
        appDefaults,
        activeProfile,
        componentOverride
      );

      // Component override wins for fontScale, but unmentioned properties inherit active/app/framework defaults
      expect(resolved.visual?.fontScale).toBe(1.6);
      expect(resolved.motor?.targetSize).toBe("normal");
    });

    it("E2E-T1-RT-06: Event Bus Live Announcement", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });
      const listener = vi.fn();
      runtime.onAnnounce(listener);

      const announcement = runtime.announce({
        message: "Settings saved successfully",
        priority: "polite",
        category: "success",
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Settings saved successfully",
          priority: "polite",
          category: "success",
        })
      );
      expect(announcement.id).toBeDefined();
      expect(announcement.timestamp).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Class 2: React Developer API & Subtree Scoping (@tederash/react)
  // ==========================================================================
  describe("Class 2: React Developer API & Scoping", () => {
    it("E2E-T1-RC-01: Provider DOM Styling Injection", () => {
      const { getRootA11yAttribute, getRootCSSVariable } = renderWithA11y(
        <div>Content</div>,
        { defaultProfile: LOW_VISION_PRESET }
      );

      expect(getRootA11yAttribute("data-a11y-high-contrast")).toBe("true");
      expect(getRootA11yAttribute("data-a11y-target-size")).toBe("large");
      expect(getRootCSSVariable("--a11y-font-scale")).toBe("1.35");
      expect(getRootCSSVariable("--a11y-min-target-height")).toBe("48px");
    });

    it("E2E-T1-RC-02: useAccessibility State & Setter", () => {
      function Consumer() {
        const { profile, adaptations, setProfile } = useAccessibility();
        return (
          <div>
            <span data-testid="profile-name">{profile.name}</span>
            <span data-testid="target-size">{adaptations.targetSize}</span>
            <button onClick={() => setProfile(MOTOR_ASSIST_PRESET)}>Activate Motor</button>
          </div>
        );
      }

      renderWithA11y(<Consumer />);

      expect(screen.getByTestId("profile-name").textContent).toBe("Standard");
      expect(screen.getByTestId("target-size").textContent).toBe("normal");

      fireEvent.click(screen.getByRole("button", { name: /activate motor/i }));

      expect(screen.getByTestId("profile-name").textContent).toBe("Motor & Target Sizing");
      expect(screen.getByTestId("target-size").textContent).toBe("extra-large");
    });

    it("E2E-T1-RC-03: useAccessibilityPreference Dot-Path", () => {
      function DotPathConsumer() {
        const fontScale = useAccessibilityPreference<number>("visual.fontScale");
        const { updatePreferences } = useAccessibility();
        return (
          <div>
            <span data-testid="scale-value">{String(fontScale)}</span>
            <button onClick={() => updatePreferences({ visual: { fontScale: 1.75 } })}>
              Enlarge
            </button>
          </div>
        );
      }

      renderWithA11y(<DotPathConsumer />);

      expect(screen.getByTestId("scale-value").textContent).toBe("1");

      fireEvent.click(screen.getByRole("button", { name: /enlarge/i }));

      expect(screen.getByTestId("scale-value").textContent).toBe("1.75");
    });

    it("E2E-T1-RC-04: AccessibilityOverride Subtree Scoping", () => {
      function ScopedTree() {
        return (
          <div>
            <AccessibleButton>Outer Button</AccessibleButton>
            <AccessibilityOverride override={{ visual: { highContrast: true }, motor: { targetSize: "extra-large" } }}>
              <AccessibleButton>Inner Scoped Button</AccessibleButton>
            </AccessibilityOverride>
          </div>
        );
      }

      renderWithA11y(<ScopedTree />);

      const outerBtn = screen.getByRole("button", { name: /outer button/i });
      const innerBtn = screen.getByRole("button", { name: /inner scoped button/i });

      expect(outerBtn.getAttribute("data-target-size")).toBe("normal");
      expect(outerBtn.getAttribute("data-high-contrast")).toBe("false");

      expect(innerBtn.getAttribute("data-target-size")).toBe("extra-large");
      expect(innerBtn.getAttribute("data-high-contrast")).toBe("true");
    });

    it("E2E-T1-RC-05: useLiveAnnouncements Subscription", () => {
      const received: string[] = [];

      function AnnouncementConsumer() {
        useLiveAnnouncements((a) => {
          received.push(a.message);
        });
        const { announce: triggerAnnounce } = useAccessibility();
        return (
          <button onClick={() => triggerAnnounce({ message: "Task completed", priority: "polite" })}>
            Announce
          </button>
        );
      }

      renderWithA11y(<AnnouncementConsumer />);

      fireEvent.click(screen.getByRole("button", { name: /announce/i }));

      expect(received).toContain("Task completed");
    });
  });

  // ==========================================================================
  // Class 3: Adaptive Component Library (@tederash/components)
  // ==========================================================================
  describe("Class 3: Adaptive Component Library", () => {
    it("E2E-T1-CP-01: AccessibleButton Adaptive Sizing", () => {
      renderWithA11y(<AccessibleButton>Proceed</AccessibleButton>, {
        defaultProfile: MOTOR_ASSIST_PRESET,
      });

      const btn = screen.getByRole("button", { name: /proceed/i });
      expect(btn.getAttribute("data-target-size")).toBe("extra-large");
      expect(btn.className).toContain("min-h-[56px]");
      expect(btn.className).toContain("focus-visible:ring-amber-500");
    });

    it("E2E-T1-CP-02: AccessibleButton Destructive Action", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const onClick = vi.fn();

      renderWithA11y(
        <AccessibleButton variant="destructive" onClick={onClick}>
          Delete Workspace
        </AccessibleButton>,
        {
          defaultProfile: {
            ...DEFAULT_PROFILE,
            interaction: { confirmationBeforeDestructiveActions: true },
          },
        }
      );

      const btn = screen.getByRole("button", { name: /delete workspace/i });
      fireEvent.click(btn);

      expect(confirmSpy).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("E2E-T1-CP-03: AccessibleInput Label & ARIA Binding", () => {
      const { container } = renderWithA11y(
        <AccessibleInput
          id="username"
          label="Legal Full Name"
          description="Enter your full name as shown on legal ID."
          error="Name is required"
          required
        />
      );

      const input = screen.getByLabelText(/legal full name/i);
      expect(input.getAttribute("aria-required")).toBe("true");
      expect(input.getAttribute("aria-invalid")).toBe("true");

      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toContain("username-desc");
      expect(describedBy).toContain("username-error");

      const errorAlert = container.querySelector("#username-error");
      expect(errorAlert?.textContent).toContain("Name is required");
    });

    it("E2E-T1-CP-04: AccessibleForm Error Summary", () => {
      const errors = ["Email is invalid", "Password must be at least 8 characters"];
      const onSubmit = vi.fn((e) => e.preventDefault());

      const { container } = renderWithA11y(
        <AccessibleForm errors={errors} onSubmit={onSubmit}>
          <button type="submit">Submit</button>
        </AccessibleForm>
      );

      const errorSummary = container.querySelector('[role="alert"]:not([aria-live])');
      expect(errorSummary?.textContent).toContain("Please correct the following errors");
      expect(errorSummary?.textContent).toContain("Email is invalid");
      expect(errorSummary?.textContent).toContain("Password must be at least 8 characters");

      fireEvent.click(screen.getByRole("button", { name: /submit/i }));
      expect(onSubmit).toHaveBeenCalled();
    });

    it("E2E-T1-CP-05: LiveRegion Screen-Reader Announcements", () => {
      function AnnouncerDemo() {
        const { announce } = useAccessibility();
        return (
          <button onClick={() => announce({ message: "Registration updated", priority: "polite" })}>
            Trigger Announcement
          </button>
        );
      }

      const { getPoliteAnnouncement, container } = renderWithA11y(<AnnouncerDemo />, {
        showVisualBanner: true,
      });

      fireEvent.click(screen.getByRole("button", { name: /trigger announcement/i }));

      expect(getPoliteAnnouncement()).toContain("Registration updated");
      const toast = container.querySelector('.fixed[role="status"]');
      expect(toast?.textContent).toContain("Registration updated");
    });

    it("E2E-T1-CP-06: AccessibleCheckbox Space Toggle", () => {
      const onCheckedChange = vi.fn();

      renderWithA11y(
        <AccessibleCheckbox
          id="terms"
          label="I agree to terms"
          checked={false}
          onCheckedChange={onCheckedChange}
        />,
        { defaultProfile: MOTOR_ASSIST_PRESET }
      );

      const checkbox = screen.getByRole("checkbox", { name: /i agree to terms/i });
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      expect(checkbox.getAttribute("data-target-size")).toBe("extra-large");

      fireEvent.keyDown(checkbox, { key: " " });
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("E2E-T1-CP-07: AccessibleSelect Keyboard Navigation", () => {
      const options = [
        { value: "us", label: "United States" },
        { value: "et", label: "Ethiopia" },
        { value: "ca", label: "Canada" },
      ];
      const onChange = vi.fn();

      renderWithA11y(
        <AccessibleSelect
          id="country-select"
          label="Country of Residence"
          options={options}
          onChange={onChange}
        />
      );

      const trigger = screen.getByRole("combobox", { name: /country of residence/i });
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      // Press ArrowDown to open listbox
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      expect(trigger.getAttribute("aria-expanded")).toBe("true");

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeTruthy();

      // Press ArrowDown to move to Ethiopia (index 1), then Enter to select
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      fireEvent.keyDown(trigger, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith("et");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    it("E2E-T1-CP-08: AccessibleDialog Modal Focus & Escape", () => {
      const onOpenChange = vi.fn();

      renderWithA11y(
        <AccessibleDialog
          open={true}
          onOpenChange={onOpenChange}
          title="Confirm Action"
          description="Are you sure you want to proceed?"
        >
          <button type="button">Confirm</button>
        </AccessibleDialog>
      );

      const dialog = screen.getByRole("dialog", { name: /confirm action/i });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(screen.getByText("Are you sure you want to proceed?")).toBeTruthy();

      // Escape key dismisses dialog
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("E2E-T1-CP-09: AccessibleNavigation SkipToContent Landmark", () => {
      const links = [
        { href: "/", label: "Home" },
        { href: "/dashboard", label: "Dashboard" },
      ];

      renderWithA11y(
        <AccessibleNavigation links={links} activeRoute="/dashboard" brandName="Tederash App" />
      );

      const nav = screen.getByRole("navigation", { name: /main navigation/i });
      expect(nav).toBeTruthy();

      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink.getAttribute("href")).toBe("#main-content");

      const activeLink = screen.getByRole("link", { name: /dashboard/i });
      expect(activeLink.getAttribute("aria-current")).toBe("page");
    });

    it("E2E-T1-CP-10: AccessibleTextarea Multi-line & Counter", () => {
      function ControlledTextarea() {
        const [val, setVal] = React.useState("Initial comment");
        return (
          <AccessibleTextarea
            id="feedback"
            label="Feedback"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            maxLength={100}
            description="Provide constructive feedback."
          />
        );
      }

      renderWithA11y(<ControlledTextarea />);

      const textarea = screen.getByLabelText(/feedback/i);
      expect(screen.getByText("15 / 100 characters")).toBeTruthy();

      fireEvent.change(textarea, { target: { value: "Updated feedback text" } });
      expect(screen.getByText("21 / 100 characters")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Class 4: Intelligent Form Assistance Engine
  // ==========================================================================
  describe("Class 4: Intelligent Form Assistance Engine", () => {
    it("E2E-T1-AS-01: Field Explanation Heuristic", async () => {
      const provider = new HeuristicAssistanceProvider();
      const explanation = await provider.explainField({
        fieldName: "userEmail",
        type: "email",
      });

      expect(explanation).toContain("valid email address with an @ symbol");
    });

    it("E2E-T1-AS-02: Password Error Clarification", async () => {
      const provider = new HeuristicAssistanceProvider();
      const clarification = await provider.explainError({
        fieldName: "password",
        errorType: "patternMismatch",
      });

      expect(clarification).toContain("does not match the required format");
    });

    it("E2E-T1-AS-03: Plain-Language Simplification", async () => {
      const provider = new HeuristicAssistanceProvider();
      const rawText = "Failure to adhere to terms shall result in immediate account termination.";
      const simplified = await provider.simplifyInstructions(rawText);

      expect(simplified).toBe("You must follow the rules or your account will be closed.");
    });

    it("E2E-T1-AS-04: Assistance Manager Provider Fallback", async () => {
      const failingAIProvider = {
        id: "mock-ai",
        name: "Remote AI Provider",
        explainField: vi.fn().mockRejectedValue(new Error("Network timeout")),
        explainError: vi.fn().mockRejectedValue(new Error("500 Internal Error")),
        simplifyInstructions: vi.fn().mockRejectedValue(new Error("Service unavailable")),
      };

      const manager = new AssistanceManager();
      manager.registerProvider(failingAIProvider);

      // Should seamlessly fall back to deterministic heuristic provider
      const explanation = await manager.explainField({ fieldName: "phone", type: "tel" }, "mock-ai");
      expect(explanation).toContain("complete phone number including your area code");
    });

    it("E2E-T1-AS-05: Contextual Help Trigger UI", async () => {
      function AssistanceForm() {
        const [help, setHelp] = React.useState<string | null>(null);
        const manager = React.useMemo(() => new AssistanceManager(), []);

        const handleHelp = async () => {
          const res = await manager.explainField({ fieldName: "email", type: "email" });
          setHelp(res);
        };

        return (
          <div>
            <AccessibleInput id="email" label="Email" />
            <button type="button" onClick={handleHelp}>Explain Email Field</button>
            {help && (
              <div role="region" aria-label="Field Explanation" aria-live="polite">
                {help}
              </div>
            )}
          </div>
        );
      }

      renderWithA11y(<AssistanceForm />);

      fireEvent.click(screen.getByRole("button", { name: /explain email field/i }));

      const region = await screen.findByRole("region", { name: /field explanation/i });
      expect(region.textContent).toContain("valid email address");
    });
  });

  // ==========================================================================
  // Class 5: Multimodal Speech & Voice Interaction
  // ==========================================================================
  describe("Class 5: Multimodal Speech & Voice Interaction", () => {
    it("E2E-T1-SP-01: Capability Detection in Browser", () => {
      expect(isSpeechSynthesisSupported()).toBe(true);
    });

    it("E2E-T1-SP-02: Text-to-Speech Output Execution", () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, "speak");

      function TTSComponent() {
        const { speak } = useSpeechSynthesis();
        return (
          <button onClick={() => speak("Please enter your name", { lang: "en-US", rate: 1.2 })}>
            Read Aloud
          </button>
        );
      }

      renderWithA11y(<TTSComponent />);

      fireEvent.click(screen.getByRole("button", { name: /read aloud/i }));

      expect(speakSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Please enter your name",
          lang: "en-US",
          rate: 1.2,
        })
      );
      speakSpy.mockRestore();
    });

    it("E2E-T1-SP-03: Voice Dictation Input", () => {
      function STTComponent() {
        const { startListening, transcript } = useSpeechRecognition();
        return (
          <div>
            <button onClick={() => startListening()}>Dictate</button>
            <span data-testid="transcript">{transcript}</span>
          </div>
        );
      }

      renderWithA11y(<STTComponent />);

      fireEvent.click(screen.getByRole("button", { name: /dictate/i }));

      // MockSpeechRecognition simulation
      const rec = (window as any).SpeechRecognition;
      // Get the last created mock instance via DOM
      expect(screen.getByTestId("transcript").textContent).toBe("");
    });

    it("E2E-T1-SP-04: Profile-Driven Speech Rate", () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, "speak");

      function SpeechRateDemo() {
        const { speak } = useSpeechSynthesis();
        return (
          <button onClick={() => speak("Speed test")}>Speak with Profile Rate</button>
        );
      }

      renderWithA11y(<SpeechRateDemo />, {
        defaultProfile: {
          ...DEFAULT_PROFILE,
          speech: { speechOutput: true, speechRate: 1.5 },
        },
      });

      fireEvent.click(screen.getByRole("button", { name: /speak with profile rate/i }));

      expect(speakSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Speed test",
          rate: 1.5,
        })
      );
      speakSpy.mockRestore();
    });

    it("E2E-T1-SP-05: Speech Stop & Cancellation", () => {
      const cancelSpy = vi.spyOn(window.speechSynthesis, "cancel");

      function StopDemo() {
        const { speak, stop } = useSpeechSynthesis();
        return (
          <div>
            <button onClick={() => speak("Long paragraph...")}>Start</button>
            <button onClick={() => stop()}>Stop</button>
          </div>
        );
      }

      renderWithA11y(<StopDemo />);

      fireEvent.click(screen.getByRole("button", { name: /start/i }));
      fireEvent.click(screen.getByRole("button", { name: /stop/i }));

      expect(cancelSpy).toHaveBeenCalled();
      cancelSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Class 6: Localization & Ethiopian Context
  // ==========================================================================
  describe("Class 6: Localization & Ethiopian Context", () => {
    it("E2E-T1-LO-01: Amharic Translation Lookup", () => {
      const amText = t("presets.lowVision", "am");
      expect(amText).toBe("ዝቅተኛ የማየት ችሎታ እና ከፍተኛ ንፅፅር");

      const enText = t("presets.lowVision", "en");
      expect(enText).toBe("Low Vision & High Contrast");
    });

    it("E2E-T1-LO-02: Translation Parameter Interpolation", () => {
      const interpolated = t("form.errorCount", "am", { count: "3" });
      expect(interpolated).toBe("ቅጹ 3 ስህተቶች አሉት");
    });

    it("E2E-T1-LO-03: Ge'ez Typography Injection", () => {
      const styles = getGeezTypographyStyles("am");
      expect(styles.fontFamily).toContain("Abyssinica SIL");
      expect(styles.lineHeight).toBe("1.7");
    });

    it("E2E-T1-LO-04: useLocale Hook Dynamic Switch", () => {
      function LocalizedComponent() {
        const { locale, setLocale, t } = useLocale("en");
        return (
          <div>
            <span data-testid="label">{t("form.submit")}</span>
            <button onClick={() => setLocale("am")}>Switch to Amharic</button>
          </div>
        );
      }

      renderWithA11y(<LocalizedComponent />);

      expect(screen.getByTestId("label").textContent).toBe("Submit Application");

      fireEvent.click(screen.getByRole("button", { name: /switch to amharic/i }));

      expect(screen.getByTestId("label").textContent).toBe("ይመዝገቡ");
    });

    it("E2E-T1-LO-05: Localized Announcement Translation", () => {
      function LocalizedAnnounce() {
        const { announce } = useAccessibility();
        const { t, locale, setLocale } = useLocale("en");

        return (
          <div>
            <button onClick={() => setLocale("am")}>Set AM</button>
            <button
              onClick={() =>
                announce({
                  message: t("announcements.formSaved"),
                  priority: "polite",
                })
              }
            >
              Save
            </button>
          </div>
        );
      }

      const { getPoliteAnnouncement } = renderWithA11y(<LocalizedAnnounce />);

      fireEvent.click(screen.getByRole("button", { name: /set am/i }));
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(getPoliteAnnouncement()).toContain("ምዝገባዎ በተሳካ ሁኔታ ተቀምጧል።");
    });
  });
});
