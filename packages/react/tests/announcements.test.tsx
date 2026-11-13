// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  createAccessibilityRuntime,
  useAnnounce,
  useLiveAnnouncements,
  Announcement,
} from "../src";

describe("useAnnounce Hook", () => {
  it("throws when called outside AccessibilityProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAnnounce())).toThrowError(
      /useAccessibility must be used within an <AccessibilityProvider>/
    );
    consoleSpy.mockRestore();
  });

  it("returns announce function that dispatches polite announcements by default", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listener = vi.fn();
    runtime.onAnnounce(listener);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAnnounce(), { wrapper });

    let announcement!: Announcement;
    act(() => {
      announcement = result.current({ message: "Form saved successfully" });
    });

    expect(announcement.id).toMatch(/^a11y-announcement-/);
    expect(announcement.message).toBe("Form saved successfully");
    expect(announcement.priority).toBe("polite");
    expect(typeof announcement.timestamp).toBe("number");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(announcement);
  });

  it("dispatches assertive announcements with category metadata", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listener = vi.fn();
    runtime.onAnnounce(listener);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAnnounce(), { wrapper });

    let announcement!: Announcement;
    act(() => {
      announcement = result.current({
        message: "Payment failed. Please retry.",
        priority: "assertive",
        category: "error",
      });
    });

    expect(announcement.message).toBe("Payment failed. Please retry.");
    expect(announcement.priority).toBe("assertive");
    expect(announcement.category).toBe("error");
    expect(listener).toHaveBeenCalledWith(announcement);
  });

  it("deduplicates identical announcements within 1500ms when requested", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listener = vi.fn();
    runtime.onAnnounce(listener);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { result } = renderHook(() => useAnnounce(), { wrapper });

    let a1!: Announcement;
    let a2!: Announcement;

    act(() => {
      a1 = result.current({ message: "Network offline", deduplicate: true });
      a2 = result.current({ message: "Network offline", deduplicate: true });
    });

    // Suppresses second dispatch and returns the existing announcement
    expect(listener).toHaveBeenCalledTimes(1);
    expect(a1.id).toBe(a2.id);

    // Different message should dispatch immediately
    act(() => {
      result.current({ message: "Network restored", deduplicate: true });
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("useLiveAnnouncements Hook", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when called outside AccessibilityProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLiveAnnouncements(vi.fn()))).toThrowError();
    consoleSpy.mockRestore();
  });

  it("subscribes to live announcements and receives dispatched events", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listener = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    renderHook(() => useLiveAnnouncements(listener), { wrapper });

    act(() => {
      runtime.announce({ message: "Document uploaded" });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Document uploaded",
        priority: "polite",
      })
    );
  });

  it("receives multiple sequential announcements in order", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const received: string[] = [];
    const listener = (a: Announcement) => received.push(a.message);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    renderHook(() => useLiveAnnouncements(listener), { wrapper });

    act(() => {
      runtime.announce({ message: "Step 1 complete" });
      runtime.announce({ message: "Step 2 complete" });
      runtime.announce({ message: "Step 3 complete" });
    });

    expect(received).toEqual(["Step 1 complete", "Step 2 complete", "Step 3 complete"]);
  });

  it("unsubscribes listener when unmounted to prevent memory leaks", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listener = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    const { unmount } = renderHook(() => useLiveAnnouncements(listener), { wrapper });

    act(() => {
      runtime.announce({ message: "Notice 1" });
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      runtime.announce({ message: "Notice 2" });
    });
    // Should NOT be called after unmount
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("supports multiple concurrent listeners without cross-interference", () => {
    const runtime = createAccessibilityRuntime({ persistence: "none" });
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider runtime={runtime}>
        {children}
      </AccessibilityProvider>
    );

    renderHook(() => useLiveAnnouncements(listenerA), { wrapper });
    renderHook(() => useLiveAnnouncements(listenerB), { wrapper });

    act(() => {
      runtime.announce({ message: "Broadcast message", priority: "polite" });
    });

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerA.mock.calls[0][0].id).toBe(listenerB.mock.calls[0][0].id);
  });
});

describe("Cross-Component Announcement Integration", () => {
  it("delivers announcements dispatched from useAnnounce to useLiveAnnouncements across component tree", () => {
    const onAnnounceCallback = vi.fn();

    function SenderComponent() {
      const announce = useAnnounce();
      return (
        <button
          onClick={() =>
            announce({
              message: "Submission received",
              priority: "polite",
              category: "success",
            })
          }
        >
          Submit
        </button>
      );
    }

    function ReceiverComponent() {
      useLiveAnnouncements(onAnnounceCallback);
      return <div data-testid="receiver">Listening</div>;
    }

    render(
      <AccessibilityProvider persistence="none">
        <SenderComponent />
        <ReceiverComponent />
      </AccessibilityProvider>
    );

    const button = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(button);

    expect(onAnnounceCallback).toHaveBeenCalledTimes(1);
    expect(onAnnounceCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Submission received",
        priority: "polite",
        category: "success",
      })
    );
  });
});
