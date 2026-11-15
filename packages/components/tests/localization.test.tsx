// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  AccessibilityProvider,
  AMHARIC_PRESET,
  OROMO_PRESET,
  useAccessibility,
} from "@tederash/react";
import {
  AccessibleForm,
  AccessibleButton,
  AccessibleDialog,
  AccessibleNavigation,
  AccessibleSelect,
  AccessibleTextarea,
} from "../src";

/** Render a tree under the Amharic preset (locale: 'am') */
function renderAmharic(ui: React.ReactElement) {
  return render(
    <AccessibilityProvider defaultProfile={AMHARIC_PRESET} persistence="none">
      {ui}
    </AccessibilityProvider>
  );
}

/** Render a tree under the Oromo preset (locale: 'om') */
function renderOromo(ui: React.ReactElement) {
  return render(
    <AccessibilityProvider defaultProfile={OROMO_PRESET} persistence="none">
      {ui}
    </AccessibilityProvider>
  );
}

afterEach(cleanup);

describe("Component localization (Amharic locale)", () => {
  it("renders the form error summary in Amharic", () => {
    renderAmharic(
      <AccessibleForm errors={["የስህተት መልእክት"]}>
        <input />
      </AccessibleForm>
    );

    expect(
      screen.getByText("እባክዎ የሚከተሉትን ስህተቶች ያስተካክሉ፦")
    ).toBeTruthy();
  });

  it("announces form errors in Amharic on submit", () => {
    const onAnnounce = vi.fn();

    function AnnounceHarness() {
      const { runtime } = useAccessibility();
      React.useEffect(
        () => runtime.onAnnounce(onAnnounce),
        [runtime, onAnnounce]
      );
      return (
        <AccessibleForm errors={["a", "b"]} onSubmit={() => {}}>
          <button type="submit">submit</button>
        </AccessibleForm>
      );
    }

    renderAmharic(<AnnounceHarness />);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(onAnnounce).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "በፎርሙ ላይ 2 ስህተቶች አሉ። እባክዎ ያስተካክሉ።",
        priority: "assertive",
      })
    );
  });

  it("renders the navigation skip link and menu toggle in Amharic", () => {
    const onAnnounce = vi.fn();
    renderAmharic(
      <div>
        <AccessibleNavigation
          links={[{ label: "መገለጫ", href: "/profile" }]}
        />
        <main id="main-content" />
      </div>
    );

    expect(screen.getByText("ወደ ዋናው ይዘት ዝለል")).toBeTruthy();

    const hamburger = screen.getByRole("button", { name: "ሜኑ ክፈት" });
    fireEvent.click(hamburger);
    expect(
      screen.getByRole("button", { name: "ሜኑ ዝጋ" })
    ).toBeTruthy();
  });

  it("uses the Amharic select placeholder", () => {
    renderAmharic(
      <AccessibleSelect
        label="ሚና"
        options={[{ value: "admin", label: "አስተዳዳሪ" }]}
      />
    );

    expect(screen.getByText("አማራጭ ይምረጡ")).toBeTruthy();
  });

  it("localizes the textarea character counter", () => {
    renderAmharic(
      <AccessibleTextarea
        label="መግለጫ"
        maxLength={100}
        defaultValue="ሰላም"
      />
    );

    expect(screen.getByText("3 / 100 ቁምፊዎች")).toBeTruthy();
  });

  it("localizes the dialog close button label", () => {
    renderAmharic(
      <AccessibleDialog
        open
        onOpenChange={() => {}}
        title="ዳይሎግ"
        description="መግለጫ"
      >
        <p>content</p>
      </AccessibleDialog>
    );

    expect(
      screen.getByRole("button", { name: "ዳይሎግ ዝጋ" })
    ).toBeTruthy();
  });

  it("falls back to English strings when locale is default", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleForm errors={["Email is required."]} />
      </AccessibilityProvider>
    );

    expect(
      screen.getByText("Please correct the following errors:")
    ).toBeTruthy();
  });
});

describe("Component localization (Oromo locale)", () => {
  it("renders the form error summary in Oromo", () => {
    renderOromo(
      <AccessibleForm errors={["Ergaa dogoggoraa"]}>
        <input />
      </AccessibleForm>
    );

    expect(
      screen.getByText("Maaloo dogoggoroota armaan gadii sirreessaa:")
    ).toBeTruthy();
  });

  it("announces form errors in Oromo on submit", () => {
    const onAnnounce = vi.fn();

    function AnnounceHarness() {
      const { runtime } = useAccessibility();
      React.useEffect(
        () => runtime.onAnnounce(onAnnounce),
        [runtime, onAnnounce]
      );
      return (
        <AccessibleForm errors={["a", "b"]} onSubmit={() => {}}>
          <button type="submit">submit</button>
        </AccessibleForm>
      );
    }

    renderOromo(<AnnounceHarness />);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(onAnnounce).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Foormichi dogoggora 2 qaba. Maaloo sirreessaa.",
        priority: "assertive",
      })
    );
  });

  it("renders the navigation skip link and menu toggle in Oromo", () => {
    renderOromo(
      <div>
        <AccessibleNavigation
          links={[{ label: "Piroofaayilii", href: "/profile" }]}
        />
        <main id="main-content" />
      </div>
    );

    expect(screen.getByText("Qabiyyee guddaatti darbi")).toBeTruthy();

    const hamburger = screen.getByRole("button", { name: "Baafata bani" });
    fireEvent.click(hamburger);
    expect(
      screen.getByRole("button", { name: "Baafata cufi" })
    ).toBeTruthy();
  });

  it("uses the Oromo select placeholder", () => {
    renderOromo(
      <AccessibleSelect
        label="Gahee"
        options={[{ value: "admin", label: "Bulchaa" }]}
      />
    );

    expect(screen.getByText("Filannoo filadhu")).toBeTruthy();
  });

  it("localizes the dialog close button label in Oromo", () => {
    renderOromo(
      <AccessibleDialog
        open
        onOpenChange={() => {}}
        title="Qaaqa"
        description="Ibsa"
      >
        <p>content</p>
      </AccessibleDialog>
    );

    expect(
      screen.getByRole("button", { name: "Qaaqa cufi" })
    ).toBeTruthy();
  });
});
