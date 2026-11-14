// @vitest-environment jsdom
import "./e2e/setup/test-globals";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  DEFAULT_PROFILE,
  READ_ALOUD_PRESET,
  VISUAL_ALERTS_PRESET,
  createAccessibilityRuntime,
} from "@tederash/react";
import { LiveRegion } from "../src";

const banner = () => document.querySelector('.fixed[role="status"]');

describe("LiveRegion and profile preferences", () => {
  it("shows the visual banner for visual-alert users even when the app disabled banners", () => {
    const runtime = createAccessibilityRuntime({ defaultProfile: VISUAL_ALERTS_PRESET, persistence: "none" });
    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion showVisualBanner={false} />
      </AccessibilityProvider>
    );
    act(() => {
      runtime.announce({ message: "Application saved." });
    });
    expect(banner()?.textContent).toContain("Application saved.");
  });

  it("keeps visual-alert banners up longer (10s instead of 4s)", () => {
    vi.useFakeTimers();
    const runtime = createAccessibilityRuntime({ defaultProfile: VISUAL_ALERTS_PRESET, persistence: "none" });
    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion />
      </AccessibilityProvider>
    );
    act(() => {
      runtime.announce({ message: "Saved." });
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(banner()).toBeTruthy();
    act(() => vi.advanceTimersByTime(5500));
    expect(banner()).toBeNull();
    vi.useRealTimers();
  });

  it("does not show a banner without the preference when banners are disabled", () => {
    const runtime = createAccessibilityRuntime({ defaultProfile: DEFAULT_PROFILE, persistence: "none" });
    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion showVisualBanner={false} />
      </AccessibilityProvider>
    );
    act(() => {
      runtime.announce({ message: "Quiet." });
    });
    expect(banner()).toBeNull();
    expect(screen.getByText("Quiet.")).toBeTruthy(); // still in the screen-reader live region
  });

  it("speaks an announcement made in the same event that turned read-aloud on", () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, "speak");
    const runtime = createAccessibilityRuntime({ defaultProfile: DEFAULT_PROFILE, persistence: "none" });
    render(
      <AccessibilityProvider runtime={runtime}>
        <LiveRegion />
      </AccessibilityProvider>
    );
    act(() => {
      runtime.setProfile(READ_ALOUD_PRESET);
      runtime.announce({ message: "Read aloud mode on." });
    });
    const spoken = speakSpy.mock.calls.map((c) => (c[0] as unknown as { text: string }).text);
    expect(spoken).toContain("Read aloud mode on.");
    speakSpy.mockRestore();
  });
});
