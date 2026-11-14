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
  KEYBOARD_FIRST_PRESET,
  AMHARIC_PRESET,
  useAccessibility,
  AccessibilityOverride,
  AccessibleButton,
  AccessibleInput,
  AccessibleForm,
  AccessibleDialog,
  AccessibleNavigation,
  HeuristicAssistanceProvider,
  useSpeechSynthesis,
  useSpeechRecognition,
  useLocale,
  MockSpeechRecognition,
} from "./setup/test-harness";

describe("Tier 3: Cross-Feature Combinations (8 Pairwise & Multi-Way Interactions)", () => {
  // ==========================================================================
  // Interaction 1: Localization + Speech Synthesis (TTS)
  // ==========================================================================
  it("E2E-T3-CM-01: Amharic Localization + Speech Synthesis TTS", () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, "speak");

    function AmharicTTSApp() {
      const { speak } = useSpeechSynthesis();
      const { t, typography } = useLocale("am");

      const handleReadAloud = () => {
        speak(t("form.submit"), { lang: "am-ET" });
      };

      return (
        <div style={typography as any}>
          <button onClick={handleReadAloud}>{t("form.submit")}</button>
        </div>
      );
    }

    renderWithA11y(<AmharicTTSApp />, { defaultProfile: AMHARIC_PRESET });

    const btn = screen.getByRole("button", { name: "ይመዝገቡ" });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);

    expect(speakSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "ይመዝገቡ",
        lang: "am-ET",
      })
    );
    speakSpy.mockRestore();
  });

  // ==========================================================================
  // Interaction 2: High Contrast + Motor Assist + AccessibleForm
  // ==========================================================================
  it("E2E-T3-CM-02: High Contrast + Motor Assist + AccessibleForm", () => {
    const combinedProfile = {
      ...DEFAULT_PROFILE,
      id: "motor-contrast",
      name: "Motor & High Contrast",
      visual: { highContrast: true },
      motor: { targetSize: "extra-large" as const, keyboardNavigation: true },
    };

    const errors = ["Field error"];

    const { container } = renderWithA11y(
      <AccessibleForm errors={errors}>
        <AccessibleInput id="field" label="Field" error="Field error" />
        <AccessibleButton type="submit">Submit</AccessibleButton>
      </AccessibleForm>,
      { defaultProfile: combinedProfile }
    );

    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn.getAttribute("data-target-size")).toBe("extra-large");
    expect(btn.getAttribute("data-high-contrast")).toBe("true");
    expect(btn.className).toContain("min-h-[56px]");
    expect(btn.className).toContain("border-2");

    const errorAlert = container.querySelector('[role="alert"]:not([aria-live])');
    expect(errorAlert).toBeTruthy();
  });

  // ==========================================================================
  // Interaction 3: AccessibleDialog + Cognitive Assistance
  // ==========================================================================
  it("E2E-T3-CM-03: AccessibleDialog + Cognitive Assistance", async () => {
    const provider = new HeuristicAssistanceProvider();

    function CognitiveDialogDemo() {
      const [isOpen, setIsOpen] = React.useState(true);
      const [dialogDesc, setDialogDesc] = React.useState("Initial text");

      React.useEffect(() => {
        provider.simplifyInstructions("Failure to adhere to terms shall result in immediate account termination.")
          .then((text) => setDialogDesc(text));
      }, []);

      return (
        <AccessibleDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Account Notice"
          description={dialogDesc}
        >
          <AccessibleButton onClick={() => setIsOpen(false)}>I Understand</AccessibleButton>
        </AccessibleDialog>
      );
    }

    renderWithA11y(<CognitiveDialogDemo />, { defaultProfile: COGNITIVE_ASSIST_PRESET });

    const dialog = screen.getByRole("dialog", { name: /account notice/i });
    expect(dialog).toBeTruthy();

    const desc = await screen.findByText("You must follow the rules or your account will be closed.");
    expect(desc).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: /i understand/i });
    fireEvent.click(confirmBtn);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // ==========================================================================
  // Interaction 4: Subtree Scoped Overrides + Global Switching
  // ==========================================================================
  it("E2E-T3-CM-04: Subtree Scoped Overrides + Global Profile Switch", () => {
    function SubtreeSwitchApp() {
      const { setProfile } = useAccessibility();
      return (
        <div>
          <button onClick={() => setProfile(MOTOR_ASSIST_PRESET)}>Set Global Motor</button>
          <AccessibleButton>Global Button</AccessibleButton>

          <AccessibilityOverride override={{ visual: { highContrast: true } }}>
            <AccessibleButton>Scoped Contrast Button</AccessibleButton>
          </AccessibilityOverride>
        </div>
      );
    }

    renderWithA11y(<SubtreeSwitchApp />);

    const globalBtn = screen.getByRole("button", { name: /global button/i });
    const scopedBtn = screen.getByRole("button", { name: /scoped contrast button/i });

    // Initial state: global is standard
    expect(globalBtn.getAttribute("data-target-size")).toBe("normal");
    expect(globalBtn.getAttribute("data-high-contrast")).toBe("false");
    expect(scopedBtn.getAttribute("data-high-contrast")).toBe("true");

    // Switch global profile to MOTOR_ASSIST_PRESET
    fireEvent.click(screen.getByRole("button", { name: /set global motor/i }));

    // Global button receives extra-large target size and standard contrast
    expect(globalBtn.getAttribute("data-target-size")).toBe("extra-large");
    expect(globalBtn.getAttribute("data-high-contrast")).toBe("false");

    // Scoped button retains its local high-contrast override AND inherits extra-large target size
    expect(scopedBtn.getAttribute("data-high-contrast")).toBe("true");
    expect(scopedBtn.getAttribute("data-target-size")).toBe("extra-large");
  });

  // ==========================================================================
  // Interaction 5: Voice Dictation + Input + Heuristic Assistance
  // ==========================================================================
  it("E2E-T3-CM-05: Speech Recognition + AccessibleInput + Form Assistance", async () => {
    const provider = new HeuristicAssistanceProvider();

    function VoiceInputAssisted() {
      const { startListening, transcript } = useSpeechRecognition();
      const [emailVal, setEmailVal] = React.useState("");
      const [error, setError] = React.useState<string | undefined>(undefined);

      React.useEffect(() => {
        if (transcript) {
          setEmailVal(transcript);
          if (!transcript.includes("@")) {
            provider.explainError({ fieldName: "email", errorType: "typeMismatch" })
              .then((msg) => setError(msg));
          } else {
            setError(undefined);
          }
        }
      }, [transcript]);

      return (
        <div>
          <AccessibleInput
            id="voice-email"
            label="Email"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            error={error}
          />
          <button onClick={() => startListening()}>Start Dictation</button>
        </div>
      );
    }

    const { container } = renderWithA11y(<VoiceInputAssisted />);

    fireEvent.click(screen.getByRole("button", { name: /start dictation/i }));

    // Simulate speech dictation of invalid email
    act(() => {
      MockSpeechRecognition.lastInstance?.simulateResult("invalid-email-string");
    });

    const errorEl = await screen.findByText(/The value entered in email is invalid/i);
    expect(errorEl).toBeTruthy();
    expect(screen.getByLabelText(/email/i).getAttribute("aria-invalid")).toBe("true");
  });

  // ==========================================================================
  // Interaction 6: Form State Preservation across Dynamic Profile Switching
  // ==========================================================================
  it("E2E-T3-CM-06: Form state preservation across profile switching", () => {
    function StatefulFormApp() {
      const { setProfile } = useAccessibility();
      const [name, setName] = React.useState("Tsegaye Worku");
      const [email, setEmail] = React.useState("tsegaye@example.com");

      return (
        <div>
          <button onClick={() => setProfile(LOW_VISION_PRESET)}>Switch Low Vision</button>
          <AccessibleInput
            id="name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <AccessibleInput
            id="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      );
    }

    renderWithA11y(<StatefulFormApp />);

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

    expect(nameInput.value).toBe("Tsegaye Worku");
    expect(emailInput.value).toBe("tsegaye@example.com");

    // Dynamic switch to Low Vision preset
    fireEvent.click(screen.getByRole("button", { name: /switch low vision/i }));

    // Form inputs must retain their full state
    expect(nameInput.value).toBe("Tsegaye Worku");
    expect(emailInput.value).toBe("tsegaye@example.com");
  });

  // ==========================================================================
  // Interaction 7: LiveRegion Deduplication + Destructive Action Cancel
  // ==========================================================================
  it("E2E-T3-CM-07: Announcement deduplication on destructive cancel", () => {
    const { getPoliteAnnouncement } = renderWithA11y(
      <AccessibleButton variant="destructive">Delete Item</AccessibleButton>,
      {
        defaultProfile: {
          ...DEFAULT_PROFILE,
          interaction: { confirmationBeforeDestructiveActions: true },
        },
      }
    );

    const btn = screen.getByRole("button", { name: /delete item/i });

    // Rapid double-click opens a single confirmation dialog
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);

    // Cancel via button, then reopen and cancel via Escape
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(btn);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).toBeNull();
    // Cancellation announcement emitted safely
    expect(getPoliteAnnouncement()).toContain("Action cancelled.");
  });

  // ==========================================================================
  // Interaction 8: AccessibleNavigation + Keyboard-First Mode
  // ==========================================================================
  it("E2E-T3-CM-08: AccessibleNavigation + Keyboard-First Mode", () => {
    const links = [
      { href: "/home", label: "Home" },
      { href: "/settings", label: "Settings" },
    ];

    renderWithA11y(
      <AccessibleNavigation links={links} activeRoute="/settings" />,
      { defaultProfile: KEYBOARD_FIRST_PRESET }
    );

    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute("href")).toBe("#main-content");

    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink.getAttribute("aria-current")).toBe("page");
    // Under keyboard first preset, focusIndicator is high-visibility
    expect(settingsLink.className).toContain("focus-visible:ring-amber-500");
  });
});
