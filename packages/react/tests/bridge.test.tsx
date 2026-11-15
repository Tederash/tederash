// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  DEFAULT_PROFILE,
  LOW_VISION_PRESET,
} from "../src";
import type {
  TederashBridgeRequestDetail,
  TederashBridgeResponseDetail,
  TederashStateChangeDetail,
} from "../src/bridge/types";

describe("Tederash In-Page Bridge & Root Handshake", () => {
  afterEach(() => {
    cleanup();
    const root = document.documentElement;
    root.style.cssText = "";
    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith("data-tederash") || attr.name.startsWith("data-a11y")) {
        root.removeAttribute(attr.name);
      }
    }
  });

  it("stamps data-tederash-root, version, profile, and locale on document.documentElement", () => {
    render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    const root = document.documentElement;
    expect(root.getAttribute("data-tederash-root")).toBe("true");
    expect(root.getAttribute("data-tederash-version")).toBe("0.2.0");
    expect(root.getAttribute("data-a11y-profile")).toBe(DEFAULT_PROFILE.id);
    expect(root.getAttribute("data-a11y-locale")).toBe("en");
  });

  it("cleans up root handshake attributes when unmounted", () => {
    const { unmount } = render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    expect(document.documentElement.hasAttribute("data-tederash-root")).toBe(true);

    unmount();

    expect(document.documentElement.hasAttribute("data-tederash-root")).toBe(false);
    expect(document.documentElement.hasAttribute("data-tederash-version")).toBe(false);
  });

  it("dispatches tederash:state_change when profile or preferences change", () => {
    const stateChangeSpy = vi.fn();
    const listener = (event: Event) => {
      const custom = event as CustomEvent<TederashStateChangeDetail>;
      stateChangeSpy(custom.detail);
    };

    window.addEventListener("tederash:state_change", listener);

    render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    expect(stateChangeSpy).toHaveBeenCalled();
    const firstCall = stateChangeSpy.mock.calls[0][0];
    expect(firstCall.profile.id).toBe(DEFAULT_PROFILE.id);

    // Send update_pref request
    act(() => {
      window.dispatchEvent(
        new CustomEvent<TederashBridgeRequestDetail>("tederash:request", {
          detail: {
            id: "req_1",
            type: "tederash:update_pref",
            payload: { patch: { visual: { fontScale: 1.5 } } },
          },
        })
      );
    });

    const lastCall = stateChangeSpy.mock.calls[stateChangeSpy.mock.calls.length - 1][0];
    expect(lastCall.adaptations.fontScale).toBe(1.5);

    window.removeEventListener("tederash:state_change", listener);
  });

  it("handles tederash:get_state bridge request", () => {
    render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    let responseDetail: TederashBridgeResponseDetail | null = null;
    const responseListener = (e: Event) => {
      responseDetail = (e as CustomEvent<TederashBridgeResponseDetail>).detail;
    };
    window.addEventListener("tederash:response", responseListener);

    act(() => {
      window.dispatchEvent(
        new CustomEvent<TederashBridgeRequestDetail>("tederash:request", {
          detail: {
            id: "test_get_state",
            type: "tederash:get_state",
          },
        })
      );
    });

    expect(responseDetail).not.toBeNull();
    expect(responseDetail!.id).toBe("test_get_state");
    expect(responseDetail!.ok).toBe(true);
    expect(responseDetail!.data.version).toBe("0.1.0");
    expect(responseDetail!.data.profile.id).toBe("standard");

    window.removeEventListener("tederash:response", responseListener);
  });

  it("handles tederash:set_profile and tederash:reset_profile bridge requests", () => {
    render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    const responses: TederashBridgeResponseDetail[] = [];
    const responseListener = (e: Event) => {
      responses.push((e as CustomEvent<TederashBridgeResponseDetail>).detail);
    };
    window.addEventListener("tederash:response", responseListener);

    // Set profile
    act(() => {
      window.dispatchEvent(
        new CustomEvent<TederashBridgeRequestDetail>("tederash:request", {
          detail: {
            id: "test_set_profile",
            type: "tederash:set_profile",
            payload: { profile: LOW_VISION_PRESET },
          },
        })
      );
    });

    expect(responses.length).toBe(1);
    expect(responses[0].id).toBe("test_set_profile");
    expect(responses[0].ok).toBe(true);
    expect(responses[0].data.profile.id).toBe("low-vision");
    expect(document.documentElement.getAttribute("data-a11y-profile")).toBe("low-vision");

    // Reset profile
    act(() => {
      window.dispatchEvent(
        new CustomEvent<TederashBridgeRequestDetail>("tederash:request", {
          detail: {
            id: "test_reset_profile",
            type: "tederash:reset_profile",
          },
        })
      );
    });

    expect(responses.length).toBe(2);
    expect(responses[1].id).toBe("test_reset_profile");
    expect(responses[1].ok).toBe(true);
    expect(responses[1].data.profile.id).toBe("standard");
    expect(document.documentElement.getAttribute("data-a11y-profile")).toBe("standard");

    window.removeEventListener("tederash:response", responseListener);
  });

  it("handles tederash:announce bridge request", () => {
    render(
      <AccessibilityProvider>
        <div>Test App</div>
      </AccessibilityProvider>
    );

    let responseDetail: TederashBridgeResponseDetail | null = null;
    const responseListener = (e: Event) => {
      responseDetail = (e as CustomEvent<TederashBridgeResponseDetail>).detail;
    };
    window.addEventListener("tederash:response", responseListener);

    act(() => {
      window.dispatchEvent(
        new CustomEvent<TederashBridgeRequestDetail>("tederash:request", {
          detail: {
            id: "test_announce",
            type: "tederash:announce",
            payload: { message: "Form submitted successfully", priority: "assertive" },
          },
        })
      );
    });

    expect(responseDetail).not.toBeNull();
    expect(responseDetail!.id).toBe("test_announce");
    expect(responseDetail!.ok).toBe(true);
    expect(responseDetail!.data.announced).toBe(true);
    expect(responseDetail!.data.message).toBe("Form submitted successfully");

    window.removeEventListener("tederash:response", responseListener);
  });
});
