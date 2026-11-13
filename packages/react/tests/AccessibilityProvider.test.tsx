// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import {
  AccessibilityProvider,
  useAccessibility,
  createAccessibilityRuntime,
  LOW_VISION_PRESET,
  MOTOR_ASSIST_PRESET,
} from "../src";

function Consumer() {
  const val = useAccessibility();
  return (
    <div>
      <span data-testid="profile-id">{val.profile.id}</span>
      <span data-testid="font-scale">{val.adaptations.fontScale}</span>
      <span data-testid="target-size">{val.adaptations.targetSize}</span>
      <span data-testid="high-contrast">{String(val.adaptations.highContrast)}</span>
      <button
        data-testid="btn-update-font"
        onClick={() => val.updatePreferences({ visual: { fontScale: 1.8 } })}
      >
        Update Font
      </button>
      <button
        data-testid="btn-set-low-vision"
        onClick={() => val.setProfile(LOW_VISION_PRESET)}
      >
        Set Low Vision
      </button>
      <button data-testid="btn-reset" onClick={() => val.resetProfile()}>
        Reset
      </button>
      <button
        data-testid="btn-announce"
        onClick={() => val.announce({ message: "Test alert", priority: "assertive" })}
      >
        Announce
      </button>
    </div>
  );
}

describe("AccessibilityProvider", () => {
  afterEach(() => {
    cleanup();
    // Clean up document.documentElement attributes and styles
    const root = document.documentElement;
    root.style.cssText = "";
    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith("data-a11y-")) {
        root.removeAttribute(attr.name);
      }
    }
  });

  describe("Initialization & Runtime Management", () => {
    it("initializes with default standard profile when no props are provided", () => {
      render(
        <AccessibilityProvider persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("profile-id").textContent).toBe("standard");
      expect(screen.getByTestId("font-scale").textContent).toBe("1");
      expect(screen.getByTestId("target-size").textContent).toBe("normal");
      expect(screen.getByTestId("high-contrast").textContent).toBe("false");
    });

    it("accepts and uses an external AccessibilityRuntime", () => {
      const runtime = createAccessibilityRuntime({
        defaultProfile: MOTOR_ASSIST_PRESET,
        persistence: "none",
      });

      render(
        <AccessibilityProvider runtime={runtime}>
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("profile-id").textContent).toBe("motor-assist");
      expect(screen.getByTestId("target-size").textContent).toBe("extra-large");
    });

    it("respects custom defaultProfile prop", () => {
      render(
        <AccessibilityProvider defaultProfile={LOW_VISION_PRESET} persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("profile-id").textContent).toBe("low-vision");
      expect(screen.getByTestId("high-contrast").textContent).toBe("true");
    });

    it("respects appDefaults overrides", () => {
      render(
        <AccessibilityProvider
          appDefaults={{ visual: { fontScale: 1.4 } }}
          persistence="none"
        >
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("font-scale").textContent).toBe("1.4");
    });
  });

  describe("Store Subscriptions & State Updates", () => {
    it("updates child components synchronously when calling context update methods", () => {
      render(
        <AccessibilityProvider persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("font-scale").textContent).toBe("1");

      fireEvent.click(screen.getByTestId("btn-update-font"));
      expect(screen.getByTestId("font-scale").textContent).toBe("1.8");

      fireEvent.click(screen.getByTestId("btn-set-low-vision"));
      expect(screen.getByTestId("profile-id").textContent).toBe("low-vision");
      expect(screen.getByTestId("high-contrast").textContent).toBe("true");

      fireEvent.click(screen.getByTestId("btn-reset"));
      expect(screen.getByTestId("profile-id").textContent).toBe("standard");
    });

    it("subscribes and reacts to external runtime updates", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });

      render(
        <AccessibilityProvider runtime={runtime}>
          <Consumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId("profile-id").textContent).toBe("standard");

      act(() => {
        runtime.setProfile(LOW_VISION_PRESET);
      });

      expect(screen.getByTestId("profile-id").textContent).toBe("low-vision");
      expect(screen.getByTestId("high-contrast").textContent).toBe("true");
    });

    it("unsubscribes from runtime when provider unmounts", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });
      const subscribeSpy = vi.spyOn(runtime, "subscribe");

      const { unmount } = render(
        <AccessibilityProvider runtime={runtime}>
          <Consumer />
        </AccessibilityProvider>
      );

      expect(subscribeSpy).toHaveBeenCalled();
      unmount();

      // Ensure updating runtime after unmount does not throw or trigger subscribers
      expect(() => {
        runtime.setProfile(LOW_VISION_PRESET);
      }).not.toThrow();
    });
  });

  describe("Root Element CSS & Data Attribute Injection", () => {
    it("injects CSS variables and data attributes to document.documentElement", () => {
      render(
        <AccessibilityProvider persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--a11y-font-scale")).toBe("1");
      expect(root.style.getPropertyValue("--a11y-min-target-height")).toBe("40px");
      expect(root.getAttribute("data-a11y-target-size")).toBe("normal");
      expect(root.getAttribute("data-a11y-high-contrast")).toBe("false");
    });

    it("dynamically updates document.documentElement when profile changes", () => {
      render(
        <AccessibilityProvider persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      const root = document.documentElement;
      expect(root.getAttribute("data-a11y-high-contrast")).toBe("false");

      fireEvent.click(screen.getByTestId("btn-set-low-vision"));

      expect(root.getAttribute("data-a11y-high-contrast")).toBe("true");
      expect(root.style.getPropertyValue("--a11y-font-scale")).toBe("1.35");
      expect(root.style.getPropertyValue("--a11y-min-target-height")).toBe("48px");
    });

    it("does not inject attributes or styles when applyStylesToRoot is false", () => {
      render(
        <AccessibilityProvider applyStylesToRoot={false} persistence="none">
          <Consumer />
        </AccessibilityProvider>
      );

      const root = document.documentElement;
      expect(root.getAttribute("data-a11y-target-size")).toBeNull();
      expect(root.style.getPropertyValue("--a11y-font-scale")).toBe("");
    });
  });

  describe("Announcements via Provider Context", () => {
    it("dispatches announcements to the runtime event bus", () => {
      const runtime = createAccessibilityRuntime({ persistence: "none" });
      const announceListener = vi.fn();
      runtime.onAnnounce(announceListener);

      render(
        <AccessibilityProvider runtime={runtime}>
          <Consumer />
        </AccessibilityProvider>
      );

      fireEvent.click(screen.getByTestId("btn-announce"));

      expect(announceListener).toHaveBeenCalledTimes(1);
      expect(announceListener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test alert",
          priority: "assertive",
        })
      );
    });
  });

  describe("Error Boundaries", () => {
    it("throws descriptive error when useAccessibility is called outside AccessibilityProvider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<Consumer />);
      }).toThrow(/useAccessibility must be used within an <AccessibilityProvider>/);

      consoleError.mockRestore();
    });
  });
});
