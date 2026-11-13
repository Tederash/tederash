// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  AccessibilityOverride,
  createAccessibilityRuntime,
  useAccessibility,
  useAccessibilityPreference,
  useAdaptations,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
} from "../src";

describe("useAccessibility Hook", () => {
  it("throws a descriptive error when used outside AccessibilityProvider", () => {
    // Suppress expected console.error from React
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAccessibility())).toThrowError(
      /useAccessibility must be used within an <AccessibilityProvider>/
    );
    consoleSpy.mockRestore();
  });

  it("returns default profile, adaptations, and runtime methods inside provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibility(), { wrapper });

    expect(result.current.profile.id).toBe("standard");
    expect(result.current.effectiveProfile.id).toBe("standard");
    expect(result.current.adaptations.fontScale).toBe(1.0);
    expect(result.current.adaptations.targetSize).toBe("normal");
    expect(result.current.adaptations.highContrast).toBe(false);
    expect(typeof result.current.setProfile).toBe("function");
    expect(typeof result.current.updatePreferences).toBe("function");
    expect(typeof result.current.resetProfile).toBe("function");
    expect(typeof result.current.announce).toBe("function");
  });

  it("updates state reactively when setProfile is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibility(), { wrapper });

    act(() => {
      result.current.setProfile(LOW_VISION_PRESET);
    });

    expect(result.current.profile.id).toBe("low-vision");
    expect(result.current.effectiveProfile.id).toBe("low-vision");
    expect(result.current.adaptations.fontScale).toBe(1.35);
    expect(result.current.adaptations.highContrast).toBe(true);
    expect(result.current.adaptations.minTargetHeight).toBe("48px");
  });

  it("updates individual preferences reactively via updatePreferences", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibility(), { wrapper });

    act(() => {
      result.current.updatePreferences({
        visual: { fontScale: 1.6 },
        motor: { targetSize: "extra-large" },
      });
    });

    expect(result.current.profile.visual?.fontScale).toBe(1.6);
    expect(result.current.profile.motor?.targetSize).toBe("extra-large");
    expect(result.current.adaptations.fontScale).toBe(1.6);
    expect(result.current.adaptations.minTargetHeight).toBe("56px");
    expect(result.current.adaptations.cssVariables["--a11y-font-scale"]).toBe("1.6");
  });

  it("resets profile back to defaults via resetProfile", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibility(), { wrapper });

    act(() => {
      result.current.setProfile(MOTOR_ASSIST_PRESET);
    });
    expect(result.current.profile.id).toBe("motor-assist");

    act(() => {
      result.current.resetProfile();
    });
    expect(result.current.profile.id).toBe("standard");
    expect(result.current.adaptations.targetSize).toBe("normal");
    expect(result.current.adaptations.minTargetHeight).toBe("40px");
  });

  it("respects AccessibilityOverride for effectiveProfile and adaptations without mutating base profile", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ visual: { fontScale: 1.8, highContrast: true } }}>
          {children}
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibility(), { wrapper });

    // Root profile remains baseline
    expect(result.current.profile.visual?.fontScale).toBe(1.0);
    expect(result.current.profile.visual?.highContrast).toBe(false);

    // Effective profile and adaptations reflect override
    expect(result.current.effectiveProfile.visual?.fontScale).toBe(1.8);
    expect(result.current.effectiveProfile.visual?.highContrast).toBe(true);
    expect(result.current.adaptations.fontScale).toBe(1.8);
    expect(result.current.adaptations.highContrast).toBe(true);
  });
});

describe("useAccessibilityPreference Hook", () => {
  it("throws when called outside AccessibilityProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAccessibilityPreference("visual.fontScale"))).toThrowError();
    consoleSpy.mockRestore();
  });

  it("retrieves top-level profile properties", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibilityPreference<string>("id"), { wrapper });
    expect(result.current).toBe("standard");
  });

  it("resolves nested preference paths via dot notation", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const fontScale = renderHook(() => useAccessibilityPreference<number>("visual.fontScale"), { wrapper });
    const highContrast = renderHook(() => useAccessibilityPreference<boolean>("visual.highContrast"), { wrapper });
    const targetSize = renderHook(() => useAccessibilityPreference<string>("motor.targetSize"), { wrapper });
    const destructiveConfirm = renderHook(
      () => useAccessibilityPreference<boolean>("interaction.confirmationBeforeDestructiveActions"),
      { wrapper }
    );

    expect(fontScale.result.current).toBe(1.0);
    expect(highContrast.result.current).toBe(false);
    expect(targetSize.result.current).toBe("normal");
    expect(destructiveConfirm.result.current).toBe(true);
  });

  it("returns undefined for non-existent or invalid paths", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const invalidKey = renderHook(() => useAccessibilityPreference("nonexistentKey"), { wrapper });
    const invalidNested = renderHook(() => useAccessibilityPreference("visual.nonexistent"), { wrapper });
    const emptyPath = renderHook(() => useAccessibilityPreference(""), { wrapper });
    const primitiveSubpath = renderHook(() => useAccessibilityPreference("visual.fontScale.invalidChild"), { wrapper });

    expect(invalidKey.result.current).toBeUndefined();
    expect(invalidNested.result.current).toBeUndefined();
    expect(emptyPath.result.current).toBeUndefined();
    expect(primitiveSubpath.result.current).toBeUndefined();
  });

  it("reactively updates when runtime preference changes", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibilityPreference<number>("visual.fontScale"), { wrapper });
    expect(result.current).toBe(1.0);

    act(() => {
      runtime.updatePreferences({ visual: { fontScale: 1.45 } });
    });

    expect(result.current).toBe(1.45);
  });

  it("resolves values from AccessibilityOverride in preference lookup", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ motor: { targetSize: "extra-large" } }}>
          {children}
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAccessibilityPreference<string>("motor.targetSize"), { wrapper });
    expect(result.current).toBe("extra-large");
  });
});

describe("useAdaptations Hook", () => {
  it("throws when called outside AccessibilityProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAdaptations())).toThrowError();
    consoleSpy.mockRestore();
  });

  it("returns standard adaptations under default profile", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAdaptations(), { wrapper });

    expect(result.current.fontScale).toBe(1.0);
    expect(result.current.minTargetHeight).toBe("40px");
    expect(result.current.targetPadding).toBe("0.5rem 1rem");
    expect(result.current.targetSize).toBe("normal");
    expect(result.current.highContrast).toBe(false);
    expect(result.current.cssVariables["--a11y-font-scale"]).toBe("1");
    expect(result.current.dataAttributes["data-a11y-target-size"]).toBe("normal");
  });

  it("reactively updates when profile changes", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAdaptations(), { wrapper });

    act(() => {
      runtime.setProfile(MOTOR_ASSIST_PRESET);
    });

    expect(result.current.targetSize).toBe("extra-large");
    expect(result.current.minTargetHeight).toBe("56px");
    expect(result.current.dataAttributes["data-a11y-target-size"]).toBe("extra-large");
  });

  it("reflects adaptations computed for AccessibilityOverride", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ visual: { highContrast: true, underlineLinks: true } }}>
          {children}
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAdaptations(), { wrapper });

    expect(result.current.highContrast).toBe(true);
    expect(result.current.underlineLinks).toBe(true);
    expect(result.current.focusIndicator).toBe("high-visibility");
    expect(result.current.dataAttributes["data-a11y-high-contrast"]).toBe("true");
  });
});
