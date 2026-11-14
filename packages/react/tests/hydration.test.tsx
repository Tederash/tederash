// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import {
  AccessibilityProvider,
  useAccessibility,
  createAccessibilityRuntime,
  DEFAULT_PROFILE,
  useSpeechSynthesis,
} from "../src";

// Renders different *structure* depending on the profile, like components that
// add speech buttons when speech is enabled.
function ProfileDependentMarkup() {
  const { adaptations } = useAccessibility();
  return (
    <div>
      <span data-testid="target">{adaptations.targetSize}</span>
      {adaptations.speechInputEnabled && <button type="button">Dictate</button>}
    </div>
  );
}

describe("SSR hydration with persisted preferences", () => {
  it("hydrates without mismatch, then applies the persisted profile", async () => {
    // Server: no storage available, so defaults are rendered.
    const serverRuntime = createAccessibilityRuntime({ persistence: "none" });
    const html = renderToString(
      <AccessibilityProvider runtime={serverRuntime} applyStylesToRoot={false}>
        <ProfileDependentMarkup />
      </AccessibilityProvider>
    );
    expect(html).not.toContain("Dictate");

    // Client: storage holds a profile that changes structure and attributes.
    const saved = {
      ...DEFAULT_PROFILE,
      id: "saved",
      motor: { targetSize: "extra-large" as const },
      speech: { speechInput: true },
    };
    const clientRuntime = createAccessibilityRuntime({
      persistence: { load: () => saved, save: vi.fn(), clear: vi.fn() },
    });

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const recoverableErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(
        container,
        <AccessibilityProvider runtime={clientRuntime} applyStylesToRoot={false}>
          <ProfileDependentMarkup />
        </AccessibilityProvider>,
        { onRecoverableError: (err) => recoverableErrors.push(err) }
      );
    });

    expect(recoverableErrors).toHaveLength(0);
    // Persisted profile is applied right after hydration.
    expect(container.querySelector('[data-testid="target"]')?.textContent).toBe("extra-large");
    expect(container.textContent).toContain("Dictate");
    container.remove();
  });
});

describe("SSR hydration with speech support", () => {
  it("useSpeechSynthesis reports unsupported during hydration, then the real value", async () => {
    const w = window as unknown as Record<string, unknown>;
    w.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [],
    };

    function ReadAloudButton() {
      const { isSupported } = useSpeechSynthesis();
      return <div>{isSupported ? <button type="button">Read aloud</button> : <span>Text only</span>}</div>;
    }

    // Server render never has speech support.
    const html = renderToString(<ReadAloudButton />);
    expect(html).toContain("Text only");

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const recoverableErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <ReadAloudButton />, {
        onRecoverableError: (err) => recoverableErrors.push(err),
      });
    });

    expect(recoverableErrors).toHaveLength(0);
    expect(container.textContent).toContain("Read aloud");
    container.remove();
    delete w.speechSynthesis;
  });
});
