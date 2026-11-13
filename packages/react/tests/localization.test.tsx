// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  AccessibilityProvider,
  AMHARIC_PRESET,
  useLocale,
  ETHIOPIC_TYPOGRAPHY,
  LATIN_TYPOGRAPHY,
} from "../src";

function renderWithProvider() {
  return renderHook(() => useLocale(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <AccessibilityProvider persistence="none">{children}</AccessibilityProvider>
    ),
  });
}

describe("useLocale", () => {
  it("defaults to the English locale and resolves typography", () => {
    const { result } = renderWithProvider();

    expect(result.current.locale).toBe("en");
    expect(result.current.direction).toBe("ltr");
    expect(result.current.typography).toBe(LATIN_TYPOGRAPHY);
    expect(result.current.dictionary.locale).toBe("en");
  });

  it("translates labels and errors with parameters", () => {
    const { result } = renderWithProvider();

    expect(result.current.t("labels.email")).toBe("Email address");
    expect(result.current.t("errors.required", { field: "Email" })).toBe(
      "Email is required."
    );
  });

  it("falls back to the key for unknown translations", () => {
    const { result } = renderWithProvider();
    expect(result.current.t("labels.nonexistent")).toBe(
      "labels.nonexistent"
    );
  });

  it("switches to Amharic and translates instantly", () => {
    const { result } = renderWithProvider();

    act(() => result.current.setLocale("am"));

    expect(result.current.locale).toBe("am");
    expect(result.current.dictionary.locale).toBe("am");
    expect(result.current.dictionary.name).toBe("አማርኛ");
    expect(result.current.t("labels.email")).toBe("የኢሜይል አድራሻ");
    expect(
      result.current.t("errors.required", { field: "የኢሜይል አድራሻ" })
    ).toBe("የኢሜይል አድራሻ ያስፈልጋል።");
  });

  it("applies Ge'ez typography tokens for the Amharic locale", () => {
    const { result } = renderWithProvider();

    act(() => result.current.setLocale("am"));

    expect(result.current.typography).toBe(ETHIOPIC_TYPOGRAPHY);
    expect(result.current.typography.lineHeight).toBeGreaterThanOrEqual(1.6);
    expect(result.current.typography.lineHeight).toBeLessThanOrEqual(1.8);
    expect(result.current.typography.fontFamily).toContain(
      "Noto Sans Ethiopic"
    );
  });

  it("updates the speech language tag when switching locale", () => {
    const { result } = renderWithProvider();

    act(() => result.current.setLocale("am"));

    expect(result.current.dictionary.speechTag).toBe("am-ET");
  });

  it("reflects a preset profile with locale 'am' at startup", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <AccessibilityProvider
          defaultProfile={AMHARIC_PRESET}
          persistence="none"
        >
          {children}
        </AccessibilityProvider>
      ),
    });

    expect(result.current.locale).toBe("am");
    expect(result.current.t("labels.fullName")).toBe("ሙሉ ስም");
  });
});
