import type { ToolKind } from './tools';

export const MAX_STEPS = 8;
export const TURN_BUDGET_MS = 60_000;
/** Perception calls allowed per turn while PAGE STATE is fresh. */
export const PERCEPTION_BUDGET = 2;
/**
 * Spoken questions allowed per turn. The point of asking out loud is to collect
 * everything at once, so a model that keeps interrogating the user is stopped.
 */
export const LISTEN_BUDGET = 2;

const ACTION_INTENT =
  /\b(type|enter|insert|fill|put|write|change|set|update|replace|choose|select|pick|check|uncheck|tick|untick|click|press|tap|submit|scroll|open)\b/i;

export function hasActionIntent(text: string): boolean {
  return ACTION_INTENT.test(text);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export type GuardVerdict =
  | { kind: 'run' }
  | { kind: 'duplicate'; note: string }
  | { kind: 'over_budget'; note: string };

/**
 * Per-turn loop guards: duplicate detection (same tool + args on an unchanged page),
 * perception budget, step and time caps, and an "act now" nudge for action requests.
 */
export class TurnGuards {
  private seen = new Set<string>();
  private perceptionCalls = 0;
  private listenCalls = 0;
  private duplicates = 0;
  private actionsTaken = 0;
  private nudged = false;
  private readonly startedAt: number;
  pageVersion = 0;

  constructor(
    private readonly userGoal: string,
    private readonly now: () => number = Date.now
  ) {
    this.startedAt = now();
  }

  check(tool: string, args: Record<string, unknown>, kind: ToolKind): GuardVerdict {
    const key = `${tool}:${stableStringify(args)}@${this.pageVersion}`;
    if (this.seen.has(key)) {
      this.duplicates++;
      return {
        kind: 'duplicate',
        note: 'You already ran this exact call and the page has not changed since. Use the earlier result; do not repeat it.',
      };
    }
    if (tool === 'listen') {
      if (this.listenCalls >= LISTEN_BUDGET) {
        return {
          kind: 'over_budget',
          note: 'You have already asked the user twice this turn. Ask for everything that is left in one written message instead, or act on what you have.',
        };
      }
      this.seen.add(key);
      this.listenCalls++;
      return { kind: 'run' };
    }
    if (kind === 'perceive' && this.perceptionCalls >= PERCEPTION_BUDGET) {
      return {
        kind: 'over_budget',
        note: 'Enough inspection for this request: PAGE STATE already lists the fields. Act with fill/choose/set_checked/click, or answer the user.',
      };
    }
    this.seen.add(key);
    if (kind === 'perceive') this.perceptionCalls++;
    else this.actionsTaken++;
    return { kind: 'run' };
  }

  /** Record a new page version (actions change the page, which makes repeats legitimate). */
  notePageVersion(version: unknown): void {
    if (typeof version === 'number' && version !== this.pageVersion) this.pageVersion = version;
  }

  /** Whether the next model step must answer in text (no more tools). */
  mustAnswer(step: number): boolean {
    return step >= MAX_STEPS - 1 || this.duplicates >= 2 || this.now() - this.startedAt > TURN_BUDGET_MS;
  }

  /** One-time nudge when the user asked for a change but the model keeps only looking. */
  actNudge(step: number): string | undefined {
    if (this.nudged || this.actionsTaken > 0 || step < 2 || !hasActionIntent(this.userGoal)) return undefined;
    this.nudged = true;
    return 'Reminder: the user asked you to change something on the page. Act now with fill, choose, set_checked or click using a handle from PAGE STATE, or ask the user which control they mean.';
  }
}
