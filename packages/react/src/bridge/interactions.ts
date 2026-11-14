import * as React from "react";

/**
 * Registry of Tederash components that can be operated deterministically by an
 * assistant (the browser extension) through the `tederash:interact` bridge request.
 * Components register under their `data-tederash-id`, and the bridge calls the
 * component's own state setters, so React state is always updated correctly.
 */

export type TederashInteractionAction = "fill" | "choose" | "setChecked";

export interface TederashInteractionHandlers {
  /** Replace a text value. */
  fill?: (value: string) => void;
  /** Choose an option by visible label or value. Return false if no option matches. */
  choose?: (option: string) => boolean;
  setChecked?: (checked: boolean) => void;
  /** Disabled / read-only components refuse interaction. */
  isDisabled?: () => boolean;
}

export interface TederashInteractionResult {
  ok: boolean;
  code?: "NOT_REGISTERED" | "UNSUPPORTED" | "DISABLED" | "NO_MATCH" | "INVALID";
  error?: string;
}

const registry = new Map<string, TederashInteractionHandlers>();

export function registerTederashInteraction(
  id: string,
  handlers: TederashInteractionHandlers
): () => void {
  registry.set(id, handlers);
  return () => {
    if (registry.get(id) === handlers) registry.delete(id);
  };
}

export function runTederashInteraction(
  id: string,
  action: TederashInteractionAction,
  value: unknown
): TederashInteractionResult {
  const handlers = registry.get(id);
  if (!handlers) return { ok: false, code: "NOT_REGISTERED", error: `No interactive component "${id}"` };
  if (handlers.isDisabled?.()) return { ok: false, code: "DISABLED", error: "Component is disabled" };
  switch (action) {
    case "fill":
      if (!handlers.fill) break;
      if (typeof value !== "string") return { ok: false, code: "INVALID", error: "fill needs a string" };
      handlers.fill(value);
      return { ok: true };
    case "choose":
      if (!handlers.choose) break;
      if (typeof value !== "string") return { ok: false, code: "INVALID", error: "choose needs a string" };
      return handlers.choose(value)
        ? { ok: true }
        : { ok: false, code: "NO_MATCH", error: `No option matching "${value}"` };
    case "setChecked":
      if (!handlers.setChecked) break;
      if (typeof value !== "boolean") return { ok: false, code: "INVALID", error: "setChecked needs a boolean" };
      handlers.setChecked(value);
      return { ok: true };
  }
  return { ok: false, code: "UNSUPPORTED", error: `"${id}" does not support ${action}` };
}

/** Registers the component for the lifetime of the mount; handlers may change every render. */
export function useTederashInteraction(
  id: string | undefined,
  handlers: TederashInteractionHandlers
): void {
  const latest = React.useRef(handlers);
  latest.current = handlers;
  React.useEffect(() => {
    if (!id) return;
    return registerTederashInteraction(id, {
      fill: (v) => latest.current.fill?.(v),
      choose: (o) => latest.current.choose?.(o) ?? false,
      setChecked: (c) => latest.current.setChecked?.(c),
      isDisabled: () => latest.current.isDisabled?.() ?? false,
    });
  }, [id]);
}

/** Case/spacing-insensitive option matching: exact label/value first, then prefix, then substring. */
export function matchTederashOption<T extends { value: string; label: string; disabled?: boolean }>(
  options: readonly T[],
  wanted: string
): T | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const w = norm(wanted);
  const enabled = options.filter((o) => !o.disabled);
  return (
    enabled.find((o) => norm(o.label) === w || norm(o.value) === w) ??
    enabled.find((o) => norm(o.label).startsWith(w)) ??
    enabled.find((o) => norm(o.label).includes(w))
  );
}
