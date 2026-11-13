// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  createAccessibilityRuntime,
  MOTOR_ASSIST_PRESET,
  LOW_VISION_PRESET,
  COGNITIVE_ASSIST_PRESET,
  KEYBOARD_FIRST_PRESET,
} from "@tederash/react";
import {
  AccessibleButton,
  AccessibleInput,
  AccessibleForm,
  LiveRegion,
  AccessibleCheckbox,
  AccessibleSelect,
  AccessibleDialog,
  AccessibleNavigation,
  AccessibleTextarea,
} from "../src";

afterEach(() => {
  cleanup();
});

// ============================================================================
// 1. AccessibleButton
// ============================================================================
describe("AccessibleButton Component", () => {
  it("renders with semantic attributes and standard size by default", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleButton>Click Me</AccessibleButton>
      </AccessibilityProvider>
    );

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeTruthy();
    expect(button.getAttribute("data-target-size")).toBe("normal");
    expect(button.className).toContain("min-h-[40px]");
  });

  it("dynamically adapts to extra-large touch target under motor assist preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: MOTOR_ASSIST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleButton>Submit Form</AccessibleButton>
      </AccessibilityProvider>
    );

    const button = screen.getByRole("button", { name: /submit form/i });
    expect(button.getAttribute("data-target-size")).toBe("extra-large");
    expect(button.className).toContain("min-h-[56px]");
    expect(button.className).toContain("focus-visible:ring-amber-500");
  });

  it("adapts with high contrast borders under low vision preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: LOW_VISION_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleButton>Save Settings</AccessibleButton>
      </AccessibilityProvider>
    );

    const button = screen.getByRole("button", { name: /save settings/i });
    expect(button.getAttribute("data-high-contrast")).toBe("true");
    expect(button.className).toContain("border-2");
  });

  it("requests confirmation before destructive action when preference is active", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const handleClick = vi.fn();

    render(
      <AccessibilityProvider persistence="none">
        <AccessibleButton variant="destructive" onClick={handleClick}>
          Delete Account
        </AccessibleButton>
      </AccessibilityProvider>
    );

    const button = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(button);

    expect(confirmSpy).toHaveBeenCalled();
    expect(handleClick).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

// ============================================================================
// 2. AccessibleInput
// ============================================================================
describe("AccessibleInput Component", () => {
  it("properly associates label and description for assistive technologies", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleInput
          id="email-field"
          label="Email Address"
          description="We'll never share your email."
          required
        />
      </AccessibilityProvider>
    );

    const input = screen.getByLabelText(/email address/i);
    expect(input).toBeTruthy();
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("email-field-desc");
  });

  it("exposes error state and aria-invalid on validation error", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleInput
          label="Password"
          error="Password must be at least 8 characters."
        />
      </AccessibilityProvider>
    );

    const input = screen.getByLabelText(/password/i);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg.textContent).toContain("Password must be at least 8 characters.");
  });
});

// ============================================================================
// 3. AccessibleForm
// ============================================================================
describe("AccessibleForm Component", () => {
  it("renders error summary banner when errors exist", () => {
    const errors = ["Email is required", "Password is required"];

    render(
      <AccessibilityProvider persistence="none">
        <AccessibleForm errors={errors}>
          <button type="submit">Submit</button>
        </AccessibleForm>
      </AccessibilityProvider>
    );

    const errorSummary = screen.getByRole("alert");
    expect(errorSummary.textContent).toContain("Please correct the following errors");
    expect(errorSummary.textContent).toContain("Email is required");
    expect(errorSummary.textContent).toContain("Password is required");
  });
});

// ============================================================================
// 4. AccessibleCheckbox
// ============================================================================
describe("AccessibleCheckbox Component", () => {
  it("renders with role='checkbox' and toggles state on click", () => {
    const handleChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox
          id="newsletter"
          label="Subscribe to newsletter"
          checked={false}
          onCheckedChange={handleChange}
        />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /subscribe to newsletter/i });
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("toggles state via keyboard Space key", () => {
    const handleChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox
          id="agree-terms"
          label="I agree to the terms"
          checked={true}
          onCheckedChange={handleChange}
        />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /i agree to the terms/i });
    expect(checkbox.getAttribute("aria-checked")).toBe("true");

    fireEvent.keyDown(checkbox, { key: " " });
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it("adapts touch target to 56px minimum hit target under motor assist preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: MOTOR_ASSIST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleCheckbox label="Large hit area" />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /large hit area/i });
    expect(checkbox.getAttribute("data-target-size")).toBe("extra-large");
    expect(checkbox.className).toContain("min-h-[56px]");
    expect(checkbox.className).toContain("min-w-[56px]");
  });

  it("adapts with high contrast borders under low vision preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: LOW_VISION_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleCheckbox label="Contrast checkbox" />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /contrast checkbox/i });
    expect(checkbox.getAttribute("data-high-contrast")).toBe("true");
    expect(checkbox.className).toContain("border-2");
  });

  it("does not toggle when disabled", () => {
    const handleChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox
          label="Disabled option"
          disabled
          onCheckedChange={handleChange}
        />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /disabled option/i });
    expect(checkbox.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(checkbox);
    fireEvent.keyDown(checkbox, { key: " " });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("supports indeterminate state with aria-checked='mixed'", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox
          label="Indeterminate parent"
          indeterminate
        />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /indeterminate parent/i });
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    expect(checkbox.textContent).toContain("—");
  });

  it("exposes error message with role='alert' and aria-invalid", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox
          label="Required agreement"
          error="You must agree before continuing."
        />
      </AccessibilityProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /required agreement/i });
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg.textContent).toContain("You must agree before continuing.");
  });

  it("forwards ref to HTMLButtonElement", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox ref={ref} label="Ref checkbox" />
      </AccessibilityProvider>
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// ============================================================================
// 5. AccessibleSelect
// ============================================================================
describe("AccessibleSelect Component", () => {
  const options = [
    { value: "us", label: "United States" },
    { value: "et", label: "Ethiopia" },
    { value: "ca", label: "Canada" },
  ];

  it("renders combobox trigger and opens listbox on click", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect id="country" label="Country" options={options} />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an option on click and invokes onChange", () => {
    const handleChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect
          label="Country"
          options={options}
          onChange={handleChange}
        />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    fireEvent.click(trigger);

    const ethiopiaOption = screen.getByText("Ethiopia");
    fireEvent.click(ethiopiaOption);

    expect(handleChange).toHaveBeenCalledWith("et");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("navigates options via keyboard ArrowDown/ArrowUp and selects with Enter", () => {
    const handleChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect
          id="country-kb"
          label="Country"
          options={options}
          onChange={handleChange}
        />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });

    // Open via ArrowDown (focuses first option: index 0)
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // Move to next option (index 1: Ethiopia)
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    // Commit selection via Enter
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(handleChange).toHaveBeenCalledWith("et");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes dropdown on Escape key", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect label="Country" options={options} />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("adapts touch target height to 56px under motor assist preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: MOTOR_ASSIST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleSelect label="Country" options={options} />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    expect(trigger.getAttribute("data-target-size")).toBe("extra-large");
    expect(trigger.className).toContain("min-h-[56px]");
  });

  it("adapts with high contrast styling under low vision preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: LOW_VISION_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleSelect label="Country" options={options} />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    expect(trigger.getAttribute("data-high-contrast")).toBe("true");
    expect(trigger.className).toContain("border-2");
  });

  it("displays error state and aria-invalid on error", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect
          label="Country"
          options={options}
          error="Country selection is required."
        />
      </AccessibilityProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /country/i });
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg.textContent).toContain("Country selection is required.");
  });

  it("forwards ref to HTMLButtonElement", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect ref={ref} label="Country" options={options} />
      </AccessibilityProvider>
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// ============================================================================
// 6. AccessibleDialog
// ============================================================================
describe("AccessibleDialog Component", () => {
  it("renders with role='dialog', aria-modal='true', and title when open=true", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Modal Header"
          description="Modal explanation description"
        >
          <p>Dialog Body</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    const dialog = screen.getByRole("dialog", { name: /modal header/i });
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Modal explanation description")).toBeTruthy();
    expect(screen.getByText("Dialog Body")).toBeTruthy();
  });

  it("does not render into DOM when open=false", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={false}
          onOpenChange={vi.fn()}
          title="Hidden Modal"
        >
          <p>Hidden Body</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Hidden Body")).toBeNull();
  });

  it("dismisses on Escape key press", () => {
    const handleOpenChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Escape Modal"
        >
          <p>Content</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses on backdrop overlay click, but not on dialog card click", () => {
    const handleOpenChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Backdrop Test"
        >
          <p>Dialog Inner</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    // Clicking inside the dialog card does not dismiss
    const dialog = screen.getByRole("dialog", { name: /backdrop test/i });
    fireEvent.click(dialog);
    expect(handleOpenChange).not.toHaveBeenCalled();

    // Clicking the backdrop overlay dismisses
    const overlay = document.querySelector('[data-slot="accessible-dialog-overlay"]');
    expect(overlay).toBeTruthy();
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it("supports role='alertdialog' for destructive confirmations", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Confirm Delete"
          role="alertdialog"
          destructive
        >
          <p>Are you sure?</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    const alertDialog = screen.getByRole("alertdialog", { name: /confirm delete/i });
    expect(alertDialog).toBeTruthy();
    expect(alertDialog.className).toContain("border-destructive");
  });

  it("dismisses when close button is clicked", () => {
    const handleOpenChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleDialog
          open={true}
          onOpenChange={handleOpenChange}
          title="Close Button Test"
        >
          <p>Body</p>
        </AccessibleDialog>
      </AccessibilityProvider>
    );

    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not steal focus from controlled inputs during parent re-renders", async () => {
    function ControlledDialogForm() {
      const [isOpen, setIsOpen] = React.useState(true);
      const [text, setText] = React.useState("");

      return (
        <div>
          <button id="trigger" type="button" onClick={() => setIsOpen(true)}>
            Open Dialog
          </button>
          <AccessibleDialog
            open={isOpen}
            onOpenChange={(v) => setIsOpen(v)}
            title="Controlled Dialog Form"
          >
            <input
              data-testid="dialog-controlled-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </AccessibleDialog>
        </div>
      );
    }

    render(
      <AccessibilityProvider persistence="none">
        <ControlledDialogForm />
      </AccessibilityProvider>
    );

    const input = screen.getByTestId("dialog-controlled-input") as HTMLInputElement;

    // Wait for initial dialog focus pass
    await new Promise((r) => setTimeout(r, 15));

    input.focus();
    expect(document.activeElement).toBe(input);

    // Simulate typing multiple characters that trigger parent re-renders via inline callback
    fireEvent.change(input, { target: { value: "hello" } });
    await new Promise((r) => setTimeout(r, 15));

    expect(input.value).toBe("hello");
    expect(document.activeElement).toBe(input);

    // Simulate typing space and more letters
    fireEvent.change(input, { target: { value: "hello world" } });
    await new Promise((r) => setTimeout(r, 15));

    expect(input.value).toBe("hello world");
    expect(document.activeElement).toBe(input);
  });
});

// ============================================================================
// 7. AccessibleNavigation
// ============================================================================
describe("AccessibleNavigation Component", () => {
  const links = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ];

  it("renders navigation landmark with skip-to-content link", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleNavigation
          links={links}
          activeRoute="/dashboard"
          brandName="Tederash UI"
        />
      </AccessibilityProvider>
    );

    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(nav).toBeTruthy();

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
  });

  it("marks active route with aria-current='page'", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleNavigation links={links} activeRoute="/dashboard" />
      </AccessibilityProvider>
    );

    const activeLink = screen.getByRole("link", { name: /dashboard/i });
    expect(activeLink.getAttribute("aria-current")).toBe("page");

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink.getAttribute("aria-current")).toBeNull();
  });

  it("applies high-visibility focus ring under keyboard-first preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: KEYBOARD_FIRST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleNavigation links={links} activeRoute="/settings" />
      </AccessibilityProvider>
    );

    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink.className).toContain("focus-visible:ring-amber-500");
  });

  it("enforces underline on links when underlineLinks preference is active", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: {
        ...LOW_VISION_PRESET,
        visual: { ...LOW_VISION_PRESET.visual, underlineLinks: true },
      },
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleNavigation links={links} activeRoute="/" />
      </AccessibilityProvider>
    );

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink.className).toContain("underline");
  });

  it("toggles mobile menu on hamburger click", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleNavigation links={links} activeRoute="/" />
      </AccessibilityProvider>
    );

    const hamburger = screen.getByRole("button", { name: /open menu/i });
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: /mobile menu/i })).toBeNull();

    fireEvent.click(hamburger);
    expect(hamburger.getAttribute("aria-expanded")).toBe("true");

    const mobileMenu = document.querySelector('[data-slot="accessible-navigation-mobile-menu"]');
    expect(mobileMenu).toBeTruthy();
  });
});

// ============================================================================
// 8. AccessibleTextarea
// ============================================================================
describe("AccessibleTextarea Component", () => {
  it("renders with label linkage, description, and required mark", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleTextarea
          id="bio"
          label="Biography"
          description="Tell us about yourself."
          required
        />
      </AccessibilityProvider>
    );

    const textarea = screen.getByLabelText(/biography/i);
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute("aria-required")).toBe("true");
    expect(textarea.getAttribute("aria-describedby")).toContain("bio-desc");
  });

  it("dynamically displays and updates character counter", () => {
    function ControlledTextarea() {
      const [val, setVal] = React.useState("Hello");
      return (
        <AccessibleTextarea
          id="notes"
          label="Notes"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          maxLength={50}
        />
      );
    }

    render(
      <AccessibilityProvider persistence="none">
        <ControlledTextarea />
      </AccessibilityProvider>
    );

    const counter = screen.getByText("5 / 50 characters");
    expect(counter).toBeTruthy();
    expect(counter.getAttribute("aria-live")).toBe("polite");

    const textarea = screen.getByLabelText(/notes/i);
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    expect(screen.getByText("11 / 50 characters")).toBeTruthy();
  });

  it("swaps to simplified description under cognitive assist preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: COGNITIVE_ASSIST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleTextarea
          id="reason"
          label="Reason"
          description="Lengthy and complex technical explanation."
          simplifiedDescription="Short simple explanation."
        />
      </AccessibilityProvider>
    );

    expect(screen.getByText("Short simple explanation.")).toBeTruthy();
    expect(screen.queryByText("Lengthy and complex technical explanation.")).toBeNull();
  });

  it("exposes error state and aria-invalid on error", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleTextarea
          id="feedback"
          label="Feedback"
          error="Feedback cannot be empty."
        />
      </AccessibilityProvider>
    );

    const textarea = screen.getByLabelText(/feedback/i);
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    const errorMsg = screen.getByRole("alert");
    expect(errorMsg.textContent).toContain("Feedback cannot be empty.");
  });

  it("adapts touch sizing under motor assist preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: MOTOR_ASSIST_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleTextarea label="Message" />
      </AccessibilityProvider>
    );

    const textarea = screen.getByRole("textbox", { name: /message/i });
    expect(textarea.getAttribute("data-target-size")).toBe("extra-large");
    expect(textarea.className).toContain("min-h-[120px]");
  });

  it("adapts with high contrast borders under low vision preset", () => {
    const runtime = createAccessibilityRuntime({
      defaultProfile: LOW_VISION_PRESET,
      persistence: "none",
    });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibleTextarea label="Message" />
      </AccessibilityProvider>
    );

    const textarea = screen.getByRole("textbox", { name: /message/i });
    expect(textarea.getAttribute("data-high-contrast")).toBe("true");
    expect(textarea.className).toContain("border-2");
  });

  it("forwards ref to HTMLTextAreaElement", () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleTextarea ref={ref} label="Comments" />
      </AccessibilityProvider>
    );

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});

// ============================================================================
// 9. LiveRegion
// ============================================================================
describe("LiveRegion Component", () => {
  it("renders polite and assertive aria-live regions", () => {
    render(
      <AccessibilityProvider persistence="none">
        <LiveRegion />
      </AccessibilityProvider>
    );

    const politeRegion = document.querySelector('[aria-live="polite"]');
    const assertiveRegion = document.querySelector('[aria-live="assertive"]');

    expect(politeRegion).toBeTruthy();
    expect(politeRegion?.getAttribute("role")).toBe("status");
    expect(assertiveRegion).toBeTruthy();
    expect(assertiveRegion?.getAttribute("role")).toBe("alert");
  });

  it("updates polite live region when polite announcement is made", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });

    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion />
      </AccessibilityProvider>
    );

    act(() => {
      runtime.announce({ message: "Changes saved successfully.", priority: "polite" });
    });

    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion?.textContent).toContain("Changes saved successfully.");
  });

  it("updates assertive live region when assertive announcement is made", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });

    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion />
      </AccessibilityProvider>
    );

    act(() => {
      runtime.announce({ message: "Network connection lost.", priority: "assertive" });
    });

    const assertiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion?.textContent).toContain("Network connection lost.");
  });

  it("displays visual banner when showVisualBanner is true", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });

    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion showVisualBanner={true} />
      </AccessibilityProvider>
    );

    act(() => {
      runtime.announce({ message: "Profile settings updated.", category: "status" });
    });

    const matches = screen.getAllByText(/Profile settings updated/i);
    expect(matches.length).toBe(2);
    expect(screen.getByText(/\[STATUS\]/i)).toBeTruthy();
  });
});
