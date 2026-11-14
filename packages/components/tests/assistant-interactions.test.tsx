// @vitest-environment jsdom
import "./setup/dom-polyfills";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { AccessibilityProvider, runTederashInteraction } from "@tederash/react";
import { AccessibleCheckbox, AccessibleInput, AccessibleSelect, AccessibleTextarea } from "../src";

afterEach(cleanup);

/**
 * The browser extension operates Tederash components through `tederash:interact`,
 * which calls the components' own state setters. These tests assert React state
 * (echoed into the DOM / reported via callbacks), not just DOM attributes.
 */
describe("assistant interactions through the component registry", () => {
  it("fills a controlled input and textarea", async () => {
    function Form() {
      const [name, setName] = React.useState("");
      const [bio, setBio] = React.useState("");
      return (
        <>
          <AccessibleInput id="name" label="Full Legal Name" value={name} onChange={(e) => setName(e.target.value)} />
          <AccessibleTextarea id="bio" label="Statement" value={bio} onChange={(e) => setBio(e.target.value)} />
          <output data-testid="echo">{`${name}|${bio}`}</output>
        </>
      );
    }
    render(
      <AccessibilityProvider persistence="none">
        <Form />
      </AccessibilityProvider>
    );
    await act(async () => {
      expect(runTederashInteraction("name", "fill", "Abebe Bikila")).toEqual({ ok: true });
      expect(runTederashInteraction("bio", "fill", "I build accessible UIs.")).toEqual({ ok: true });
    });
    expect(screen.getByTestId("echo").textContent).toBe("Abebe Bikila|I build accessible UIs.");
  });

  it("never fills password inputs and refuses disabled fields", async () => {
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleInput id="pw" label="Password" type="password" />
        <AccessibleInput id="ro" label="Locked" disabled />
      </AccessibilityProvider>
    );
    await act(async () => {
      runTederashInteraction("pw", "fill", "secret");
    });
    expect((screen.getByLabelText(/Password/) as HTMLInputElement).value).toBe("");
    expect(runTederashInteraction("ro", "fill", "x")).toMatchObject({ ok: false, code: "DISABLED" });
  });

  it("chooses a Radix select option by label and reports no match", async () => {
    const onChange = vi.fn();
    const options = [
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid (Addis Ababa)" },
    ];
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleSelect id="loc" label="Work Location" options={options} onChange={onChange} />
      </AccessibilityProvider>
    );
    await act(async () => {
      expect(runTederashInteraction("loc", "choose", "hybrid")).toEqual({ ok: true });
    });
    expect(onChange).toHaveBeenCalledWith("hybrid");
    expect(screen.getByRole("combobox", { name: /Work Location/ }).textContent).toContain("Hybrid (Addis Ababa)");
    expect(runTederashInteraction("loc", "choose", "Mars")).toMatchObject({ ok: false, code: "NO_MATCH" });
  });

  it("checks and unchecks a checkbox", async () => {
    const onCheckedChange = vi.fn();
    render(
      <AccessibilityProvider persistence="none">
        <AccessibleCheckbox id="terms" label="I agree" onCheckedChange={onCheckedChange} />
      </AccessibilityProvider>
    );
    await act(async () => {
      runTederashInteraction("terms", "setChecked", true);
    });
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("checkbox", { name: /I agree/ }).getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      runTederashInteraction("terms", "setChecked", false);
    });
    expect(screen.getByRole("checkbox", { name: /I agree/ }).getAttribute("aria-checked")).toBe("false");
  });
});
