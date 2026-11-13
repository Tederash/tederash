// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  AccessibilityOverride,
  useAccessibility,
  useAccessibilityPreference,
  useAdaptations,
  createAccessibilityRuntime,
} from "../src";

function SubtreeConsumer({ id }: { id: string }) {
  const { profile, effectiveProfile, adaptations } = useAccessibility();
  const fontPref = useAccessibilityPreference<number>("visual.fontScale");
  const directAdaptations = useAdaptations();

  return (
    <div data-testid={`consumer-${id}`}>
      <span data-testid={`${id}-global-high-contrast`}>
        {String(profile.visual?.highContrast)}
      </span>
      <span data-testid={`${id}-effective-high-contrast`}>
        {String(effectiveProfile.visual?.highContrast)}
      </span>
      <span data-testid={`${id}-target-size`}>{adaptations.targetSize}</span>
      <span data-testid={`${id}-min-height`}>{adaptations.minTargetHeight}</span>
      <span data-testid={`${id}-focus-indicator`}>{adaptations.focusIndicator}</span>
      <span data-testid={`${id}-font-pref`}>{fontPref}</span>
      <span data-testid={`${id}-hook-min-height`}>
        {directAdaptations.minTargetHeight}
      </span>
      <span data-testid={`${id}-simplified`}>
        {String(effectiveProfile.cognitive?.simplifiedLanguage)}
      </span>
    </div>
  );
}

describe("AccessibilityOverride", () => {
  afterEach(() => {
    cleanup();
    const root = document.documentElement;
    root.style.cssText = "";
    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith("data-a11y-")) {
        root.removeAttribute(attr.name);
      }
    }
  });

  it("applies preference overrides to enclosed subtree while preserving global profile", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ visual: { highContrast: true } }}>
          <SubtreeConsumer id="overridden" />
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    // Global profile remains untouched
    expect(screen.getByTestId("overridden-global-high-contrast").textContent).toBe("false");
    // Effective profile reflects override
    expect(screen.getByTestId("overridden-effective-high-contrast").textContent).toBe("true");
    // Resolved adaptations reflect high contrast
    expect(screen.getByTestId("overridden-focus-indicator").textContent).toBe("high-visibility");
  });

  it("isolates overrides from sibling subtrees", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ motor: { targetSize: "extra-large" } }}>
          <SubtreeConsumer id="branch-a" />
        </AccessibilityOverride>
        <SubtreeConsumer id="branch-b" />
      </AccessibilityProvider>
    );

    // Branch A has overridden extra-large size
    expect(screen.getByTestId("branch-a-target-size").textContent).toBe("extra-large");
    expect(screen.getByTestId("branch-a-min-height").textContent).toBe("56px");

    // Branch B has normal baseline size
    expect(screen.getByTestId("branch-b-target-size").textContent).toBe("normal");
    expect(screen.getByTestId("branch-b-min-height").textContent).toBe("40px");
  });

  it("does not mutate document.documentElement root attributes or styles", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ motor: { targetSize: "extra-large" } }}>
          <SubtreeConsumer id="overridden" />
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    const root = document.documentElement;
    // Root should reflect standard profile, NOT the subtree override
    expect(root.getAttribute("data-a11y-target-size")).toBe("normal");
    expect(root.style.getPropertyValue("--a11y-min-target-height")).toBe("40px");
  });

  it("handles nested overrides with child precedence", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ motor: { targetSize: "large" } }}>
          <SubtreeConsumer id="outer" />
          <AccessibilityOverride override={{ motor: { targetSize: "extra-large" } }}>
            <SubtreeConsumer id="inner" />
          </AccessibilityOverride>
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    expect(screen.getByTestId("outer-target-size").textContent).toBe("large");
    expect(screen.getByTestId("outer-min-height").textContent).toBe("48px");

    expect(screen.getByTestId("inner-target-size").textContent).toBe("extra-large");
    expect(screen.getByTestId("inner-min-height").textContent).toBe("56px");
  });

  it("merges nested overrides across distinct categories", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride override={{ visual: { highContrast: true } }}>
          <AccessibilityOverride override={{ cognitive: { simplifiedLanguage: true } }}>
            <SubtreeConsumer id="merged" />
          </AccessibilityOverride>
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    expect(screen.getByTestId("merged-effective-high-contrast").textContent).toBe("true");
    expect(screen.getByTestId("merged-simplified").textContent).toBe("true");
  });

  it("reacties dynamically to global runtime changes for non-overridden properties", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });

    render(
      <AccessibilityProvider runtime={runtime}>
        <AccessibilityOverride override={{ visual: { highContrast: true } }}>
          <SubtreeConsumer id="reactive" />
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    expect(screen.getByTestId("reactive-font-pref").textContent).toBe("1");
    expect(screen.getByTestId("reactive-effective-high-contrast").textContent).toBe("true");

    // Update global preferences for fontScale
    act(() => {
      runtime.updatePreferences({ visual: { fontScale: 1.6 } });
    });

    // Subtree receives global fontScale update while retaining its highContrast override
    expect(screen.getByTestId("reactive-font-pref").textContent).toBe("1.6");
    expect(screen.getByTestId("reactive-effective-high-contrast").textContent).toBe("true");
  });

  it("propagates overrides into subordinate hooks (useAccessibilityPreference and useAdaptations)", () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibilityOverride
          override={{
            visual: { fontScale: 1.75 },
            motor: { targetSize: "extra-large" },
          }}
        >
          <SubtreeConsumer id="hooks" />
        </AccessibilityOverride>
      </AccessibilityProvider>
    );

    expect(screen.getByTestId("hooks-font-pref").textContent).toBe("1.75");
    expect(screen.getByTestId("hooks-hook-min-height").textContent).toBe("56px");
  });
});
