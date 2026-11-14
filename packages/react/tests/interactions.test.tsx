// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import {
  AccessibilityProvider,
  matchTederashOption,
  registerTederashInteraction,
  runTederashInteraction,
  useTederashInteraction,
} from "../src";
import type { TederashBridgeResponseDetail } from "../src/bridge/types";

function bridge(payload: Record<string, unknown>): Promise<TederashBridgeResponseDetail> {
  return new Promise((resolve) => {
    const id = `r_${Math.random()}`;
    const onResponse = (e: Event) => {
      const detail = (e as CustomEvent<TederashBridgeResponseDetail>).detail;
      if (detail.id !== id) return;
      window.removeEventListener("tederash:response", onResponse);
      resolve(detail);
    };
    window.addEventListener("tederash:response", onResponse);
    window.dispatchEvent(new CustomEvent("tederash:request", { detail: { id, type: "tederash:interact", payload } }));
  });
}

function Field({ id, disabled = false }: { id: string; disabled?: boolean }) {
  const [value, setValue] = React.useState("");
  useTederashInteraction(id, { fill: setValue, isDisabled: () => disabled });
  return <output data-testid={id}>{value}</output>;
}

describe("Tederash interaction registry", () => {
  afterEach(cleanup);

  it("runs registered handlers and reports unsupported / unknown / disabled", () => {
    let checked = false;
    const off = registerTederashInteraction("c", { setChecked: (v) => (checked = v) });
    expect(runTederashInteraction("c", "setChecked", true)).toEqual({ ok: true });
    expect(checked).toBe(true);
    expect(runTederashInteraction("c", "fill", "x")).toMatchObject({ ok: false, code: "UNSUPPORTED" });
    expect(runTederashInteraction("c", "setChecked", "yes")).toMatchObject({ ok: false, code: "INVALID" });
    off();
    expect(runTederashInteraction("c", "setChecked", true)).toMatchObject({ ok: false, code: "NOT_REGISTERED" });
  });

  it("matches options by label or value, prefix, then substring, skipping disabled", () => {
    const opts = [
      { value: "sr", label: "Senior Engineer" },
      { value: "st", label: "Staff Engineer" },
      { value: "rm", label: "Remote", disabled: true },
    ];
    expect(matchTederashOption(opts, "staff engineer")?.value).toBe("st");
    expect(matchTederashOption(opts, "sr")?.value).toBe("sr");
    expect(matchTederashOption(opts, "Senior")?.value).toBe("sr");
    expect(matchTederashOption(opts, "remote")).toBeUndefined();
  });

  it("serves tederash:interact over the provider bridge, updating React state", async () => {
    const { getByTestId, unmount } = render(
      <AccessibilityProvider>
        <Field id="name" />
        <Field id="locked" disabled />
      </AccessibilityProvider>
    );
    let res: TederashBridgeResponseDetail | undefined;
    await act(async () => {
      res = await bridge({ id: "name", action: "fill", value: "Abebe Bikila" });
    });
    expect(res?.ok).toBe(true);
    expect(getByTestId("name").textContent).toBe("Abebe Bikila");

    await act(async () => {
      res = await bridge({ id: "locked", action: "fill", value: "x" });
    });
    expect(res).toMatchObject({ ok: false, data: { code: "DISABLED" } });

    await act(async () => {
      res = await bridge({ id: "nope", action: "fill", value: "x" });
    });
    expect(res).toMatchObject({ ok: false, data: { code: "NOT_REGISTERED" } });

    await act(async () => {
      res = await bridge({ id: "name", action: "explode" });
    });
    expect(res?.ok).toBe(false);

    // Unmounting unregisters.
    unmount();
    expect(runTederashInteraction("name", "fill", "x")).toMatchObject({ code: "NOT_REGISTERED" });
  });
});
