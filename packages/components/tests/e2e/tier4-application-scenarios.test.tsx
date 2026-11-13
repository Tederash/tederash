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
  useAccessibility,
  AccessibilityOverride,
  AccessibleButton,
  AccessibleInput,
  AccessibleForm,
  AccessibleDialog,
  AccessibleTextarea,
  HeuristicAssistanceProvider,
  useSpeechSynthesis,
  useSpeechRecognition,
  useLocale,
  t,
  getGeezTypographyStyles,
  MockSpeechRecognition,
} from "./setup/test-harness";

describe("Tier 4: Real-World Application Scenarios (5 End-to-End User Workflows)", () => {
  // ==========================================================================
  // Scenario 1: Multi-Step Registration Flow with Dynamic Profile Switching
  // ==========================================================================
  it("E2E-T4-SC-01: Multi-step registration flow with dynamic profile switching and target scaling", () => {
    function MultiStepRegistration() {
      const { profile, setProfile, announce } = useAccessibility();
      const [step, setStep] = React.useState(1);
      const [fullName, setFullName] = React.useState("");
      const [email, setEmail] = React.useState("");

      const handlePresetChange = (preset: typeof LOW_VISION_PRESET) => {
        setProfile(preset);
        announce({
          message: `Activated ${preset.name} accessibility profile.`,
          priority: "polite",
        });
      };

      const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
        announce({
          message: "Step 1 completed. Moving to Step 2.",
          priority: "polite",
        });
      };

      return (
        <div>
          <div className="controls mb-4">
            <button onClick={() => handlePresetChange(LOW_VISION_PRESET)}>
              Switch Low Vision
            </button>
            <button onClick={() => handlePresetChange(MOTOR_ASSIST_PRESET)}>
              Switch Motor Assist
            </button>
          </div>

          <AccessibleForm onSubmit={handleNext}>
            {step === 1 ? (
              <div data-testid="step-1">
                <AccessibleInput
                  id="full-name"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <AccessibleInput
                  id="reg-email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <AccessibleButton type="submit">Next Step</AccessibleButton>
              </div>
            ) : (
              <div data-testid="step-2">
                <h2>Step 2: Confirmation</h2>
                <p>Welcome, {fullName} ({email})!</p>
              </div>
            )}
          </AccessibleForm>
        </div>
      );
    }

    const { getRootA11yAttribute, getRootCSSVariable, getPoliteAnnouncement } = renderWithA11y(
      <MultiStepRegistration />
    );

    // Initial state: standard
    expect(getRootA11yAttribute("data-a11y-target-size")).toBe("normal");
    expect(getRootCSSVariable("--a11y-font-scale")).toBe("1");

    // 1. User activates Low Vision Preset
    fireEvent.click(screen.getByRole("button", { name: /switch low vision/i }));
    expect(getRootA11yAttribute("data-a11y-high-contrast")).toBe("true");
    expect(getRootCSSVariable("--a11y-font-scale")).toBe("1.35");
    expect(getPoliteAnnouncement()).toContain("Activated Low Vision & High Contrast");

    // 2. User fills form fields
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(nameInput, { target: { value: "Abebe Kebede" } });
    fireEvent.change(emailInput, { target: { value: "abebe@example.com" } });

    // 3. User switches to Motor Assist Preset
    fireEvent.click(screen.getByRole("button", { name: /switch motor assist/i }));
    expect(getRootA11yAttribute("data-a11y-target-size")).toBe("extra-large");
    expect(getRootCSSVariable("--a11y-min-target-height")).toBe("56px");

    // Verify inputs preserved their values across profile shift
    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe("Abebe Kebede");
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("abebe@example.com");

    const submitBtn = screen.getByRole("button", { name: /next step/i });
    expect(submitBtn.getAttribute("data-target-size")).toBe("extra-large");
    expect(submitBtn.className).toContain("min-h-[56px]");

    // 4. User submits step 1
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("step-2")).toBeTruthy();
    expect(screen.getByText(/Welcome, Abebe Kebede/i)).toBeTruthy();
    expect(getPoliteAnnouncement()).toContain("Step 1 completed");
  });

  // ==========================================================================
  // Scenario 2: Cognitive Guided Form Completion with Plain-Language Assistance
  // ==========================================================================
  it("E2E-T4-SC-02: Cognitive guided form completion with plain-language explanations", async () => {
    const assistance = new HeuristicAssistanceProvider();

    function CognitiveGuidedForm() {
      const { announce } = useAccessibility();
      const [phone, setPhone] = React.useState("");
      const [errors, setErrors] = React.useState<string[]>([]);
      const [helpText, setHelpText] = React.useState<string | null>(null);

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
          setErrors(["The phone number is too short."]);
          announce({
            message: "The form has 1 error. Please review and correct them.",
            priority: "assertive",
          });
        } else {
          setErrors([]);
          announce({
            message: "Form submitted successfully.",
            priority: "polite",
          });
        }
      };

      const handleRequestHelp = async () => {
        const guidance = await assistance.explainField({
          fieldName: "phone",
          type: "tel",
          label: "Phone Number",
        });
        setHelpText(guidance);
      };

      return (
        <AccessibleForm errors={errors} onSubmit={handleSubmit}>
          <AccessibleInput
            id="phone"
            label="Phone Number"
            description="Format: 10 digits"
            simplifiedDescription="Your 10-digit phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <button type="button" onClick={handleRequestHelp}>
            Request Phone Help
          </button>

          {helpText && (
            <div role="region" aria-label="Phone Guidance" aria-live="polite">
              {helpText}
            </div>
          )}

          <AccessibleButton type="submit">Submit Form</AccessibleButton>
        </AccessibleForm>
      );
    }

    const { container, getAssertiveAnnouncement, getPoliteAnnouncement } = renderWithA11y(
      <CognitiveGuidedForm />,
      { defaultProfile: COGNITIVE_ASSIST_PRESET }
    );

    // Form has guided container attribute
    const form = container.querySelector("form")!;
    expect(form.getAttribute("data-guided")).toBe("true");

    // Displays simplified description instead of technical format
    expect(screen.getByText("Your 10-digit phone number")).toBeTruthy();
    expect(screen.queryByText("Format: 10 digits")).toBeNull();

    // 1. Submit incomplete phone number ("123")
    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /submit form/i }));

    // Error alert banner displayed
    const errorBanner = container.querySelector('[role="alert"]:not([aria-live])');
    expect(errorBanner?.textContent).toContain("The phone number is too short.");
    expect(getAssertiveAnnouncement()).toContain("The form has 1 error");

    // 2. Request contextual assistance
    fireEvent.click(screen.getByRole("button", { name: /request phone help/i }));
    const guidanceRegion = await screen.findByRole("region", { name: /phone guidance/i });
    expect(guidanceRegion.textContent).toContain("Enter your complete phone number including your area code");

    // 3. User corrects phone number
    fireEvent.change(phoneInput, { target: { value: "5551234567" } });
    fireEvent.click(screen.getByRole("button", { name: /submit form/i }));

    // Errors cleared and success announced
    expect(container.querySelector('[role="alert"]:not([aria-live])')).toBeNull();
    expect(getPoliteAnnouncement()).toContain("Form submitted successfully.");
  });

  // ==========================================================================
  // Scenario 3: Multimodal Voice Dictation, Speech Readout, & Dialog Confirmation
  // ==========================================================================
  it("E2E-T4-SC-03: Multimodal voice dictation, speech readout, and accessible modal confirmation", () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, "speak");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    function MultimodalCancellationApp() {
      const { announce } = useAccessibility();
      const { speak } = useSpeechSynthesis();
      const { startListening, transcript } = useSpeechRecognition();
      const [reason, setReason] = React.useState("");
      const [dialogOpen, setDialogOpen] = React.useState(false);

      React.useEffect(() => {
        if (transcript) {
          setReason(transcript);
        }
      }, [transcript]);

      const handleReadAloud = () => {
        speak(reason, { rate: 1.0 });
      };

      const handleConfirmDelete = () => {
        setDialogOpen(false);
        announce({
          message: "Subscription successfully cancelled.",
          priority: "polite",
        });
      };

      return (
        <div>
          <AccessibleTextarea
            id="cancellation-reason"
            label="Cancellation Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />

          <div className="flex gap-2 mt-2">
            <button onClick={() => startListening()}>Voice Dictate Reason</button>
            <button onClick={handleReadAloud}>Read Reason Aloud</button>
            <AccessibleButton
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              Cancel Subscription
            </AccessibleButton>
          </div>

          <AccessibleDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Confirm Subscription Cancellation"
            description="Are you sure? This action is permanent."
            role="alertdialog"
          >
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDialogOpen(false)}>Keep Subscription</button>
              <AccessibleButton variant="destructive" onClick={handleConfirmDelete}>
                Confirm Cancellation
              </AccessibleButton>
            </div>
          </AccessibleDialog>
        </div>
      );
    }

    const { getPoliteAnnouncement } = renderWithA11y(<MultimodalCancellationApp />);

    // 1. Voice dictation
    fireEvent.click(screen.getByRole("button", { name: /voice dictate reason/i }));
    act(() => {
      MockSpeechRecognition.lastInstance?.simulateResult("Moving to a new platform");
    });

    const textarea = screen.getByLabelText(/cancellation reason/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Moving to a new platform");
    expect(screen.getByText("24 / 200 characters")).toBeTruthy();

    // 2. Read aloud TTS
    fireEvent.click(screen.getByRole("button", { name: /read reason aloud/i }));
    expect(speakSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Moving to a new platform",
        rate: 1.0,
      })
    );

    // 3. Open alertdialog confirmation modal
    fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));
    const dialog = screen.getByRole("alertdialog", { name: /confirm subscription cancellation/i });
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // 4. Confirm cancellation
    fireEvent.click(screen.getByRole("button", { name: /confirm cancellation/i }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(getPoliteAnnouncement()).toContain("Subscription successfully cancelled.");

    speakSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  // ==========================================================================
  // Scenario 4: Ethiopian Context (Amharic) Localization & Ge'ez Typography
  // ==========================================================================
  it("E2E-T4-SC-04: Ethiopian context (Amharic) localization, Ge'ez typography line-height, and speech announcement", () => {
    function EthiopianRegistration() {
      const [currentLocale, setCurrentLocale] = React.useState("en");
      const { announce } = useAccessibility();
      const [name, setName] = React.useState("");
      const [error, setError] = React.useState<string | undefined>(undefined);

      const handleSwitchAmharic = () => {
        setCurrentLocale("am");
        announce({
          message: t("announcements.profileActivated", "am", { name: "የአማርኛ" }),
          priority: "polite",
        });
      };

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
          setError(t("form.fieldRequired", currentLocale));
          announce({
            message: t("form.fieldRequired", currentLocale),
            priority: "assertive",
          });
        } else {
          setError(undefined);
          announce({
            message: t("announcements.formSaved", currentLocale),
            priority: "polite",
          });
        }
      };

      const typography = getGeezTypographyStyles(currentLocale);

      return (
        <div style={typography as any}>
          <button onClick={handleSwitchAmharic}>ቋንቋ ወደ አማርኛ ቀይር</button>

          <AccessibleForm errors={error ? [error] : []} onSubmit={handleSubmit}>
            <AccessibleInput
              id="eth-name"
              label={t("form.fullName", currentLocale)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
            />
            <AccessibleButton type="submit">{t("form.submit", currentLocale)}</AccessibleButton>
          </AccessibleForm>
        </div>
      );
    }

    const { container, getPoliteAnnouncement, getAssertiveAnnouncement } = renderWithA11y(
      <EthiopianRegistration />,
      { defaultProfile: AMHARIC_PRESET }
    );

    // 1. Switch to Amharic
    fireEvent.click(screen.getByRole("button", { name: "ቋንቋ ወደ አማርኛ ቀይር" }));
    expect(getPoliteAnnouncement()).toContain("የአማርኛ ተደራሽነት መገለጫ ነቅቷል።");

    // Labels update to Amharic
    expect(screen.getByLabelText("ሙሉ ስም")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ይመዝገቡ" })).toBeTruthy();

    // Verify Ge'ez typography line-height compensation (1.7)
    const geezStyles = getGeezTypographyStyles("am");
    expect(geezStyles.fontFamily).toContain("Abyssinica SIL");
    expect(geezStyles.lineHeight).toBe("1.7");

    // 2. Submit empty field -> Assertive Amharic error
    fireEvent.click(screen.getByRole("button", { name: "ይመዝገቡ" }));
    expect(getAssertiveAnnouncement()).toContain("እባክዎ ይህንን መስክ ይሙሉ");
    const errorAlert = container.querySelector('[role="alert"]:not([aria-live])');
    expect(errorAlert?.textContent).toContain("እባክዎ ይህንን መስክ ይሙሉ");

    // 3. Complete input with Amharic Ge'ez characters
    const input = screen.getByLabelText("ሙሉ ስም");
    fireEvent.change(input, { target: { value: "ተስፋዬ ወርቁ" } });
    fireEvent.click(screen.getByRole("button", { name: "ይመዝገቡ" }));

    // Errors cleared and success announced in Amharic
    expect(container.querySelector('[role="alert"]:not([aria-live])')).toBeNull();
    expect(getPoliteAnnouncement()).toContain("ምዝገባዎ በተሳካ ሁኔታ ተቀምጧል።");
  });

  // ==========================================================================
  // Scenario 5: Nested Workspace Settings with Scoped Subtree Overrides
  // ==========================================================================
  it("E2E-T4-SC-05: Nested workspace settings with scoped AccessibilityOverride subtrees", () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    function WorkspaceSettingsApp() {
      const [workspaceName, setWorkspaceName] = React.useState("My Team Workspace");
      const [deleted, setDeleted] = React.useState(false);

      return (
        <div>
          <h2>Workspace Settings</h2>
          <div data-testid="general-section" className="p-4">
            <AccessibleInput
              id="ws-name"
              label="Workspace Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <AccessibleButton>Save Workspace</AccessibleButton>
          </div>

          <div data-testid="danger-zone" className="mt-8 p-4 border border-destructive">
            <h3>Danger Zone</h3>
            <AccessibilityOverride
              override={{
                visual: { highContrast: true },
                motor: { targetSize: "extra-large" },
                interaction: { confirmationBeforeDestructiveActions: true },
              }}
            >
              {deleted ? (
                <p>Workspace has been deleted.</p>
              ) : (
                <AccessibleButton
                  variant="destructive"
                  onClick={() => setDeleted(true)}
                  confirmDestructivePrompt="Confirm permanent deletion of workspace?"
                >
                  Delete Entire Workspace
                </AccessibleButton>
              )}
            </AccessibilityOverride>
          </div>
        </div>
      );
    }

    const { getPoliteAnnouncement } = renderWithA11y(<WorkspaceSettingsApp />, {
      defaultProfile: DEFAULT_PROFILE,
    });

    const generalSaveBtn = screen.getByRole("button", { name: /save workspace/i });
    const dangerDeleteBtn = screen.getByRole("button", { name: /delete entire workspace/i });

    // General button is standard 40px and normal contrast
    expect(generalSaveBtn.getAttribute("data-target-size")).toBe("normal");
    expect(generalSaveBtn.getAttribute("data-high-contrast")).toBe("false");

    // Danger Zone button is scoped with extra-large 56px and high-contrast
    expect(dangerDeleteBtn.getAttribute("data-target-size")).toBe("extra-large");
    expect(dangerDeleteBtn.getAttribute("data-high-contrast")).toBe("true");
    expect(dangerDeleteBtn.className).toContain("min-h-[56px]");

    // 1. User clicks delete and cancels in browser confirmation dialog
    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(dangerDeleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith("Confirm permanent deletion of workspace?");
    expect(screen.queryByText("Workspace has been deleted.")).toBeNull();
    expect(getPoliteAnnouncement()).toContain("Action cancelled.");

    // 2. User clicks delete again and confirms
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(dangerDeleteBtn);

    expect(screen.getByText("Workspace has been deleted.")).toBeTruthy();
    confirmSpy.mockRestore();
  });
});
