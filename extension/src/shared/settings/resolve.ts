import { BUILTIN_DEFAULTS } from './defaults';
import type { EffectiveSettings, SettingsPatch } from './schema';

export interface ResolveContext {
  globalPatch?: SettingsPatch;
  profilePatch?: SettingsPatch;
  sitePatch?: SettingsPatch;
  sessionPatch?: SettingsPatch;
}

function mergeDefined<T extends Record<string, unknown>>(base: T, patch?: Partial<T>): T {
  if (!patch) return { ...base };
  const result = { ...base };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const val = patch[key];
    if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

export function applyPatch(base: EffectiveSettings, patch?: SettingsPatch): EffectiveSettings {
  if (!patch) return base;
  return {
    disabledOnSite: patch.disabledOnSite ?? base.disabledOnSite,
    adaptation: mergeDefined(base.adaptation, patch.adaptation),
    voice: mergeDefined(base.voice, patch.voice),
    ui: mergeDefined(base.ui, patch.ui),
    privacy: mergeDefined(base.privacy, patch.privacy),
  };
}

/**
 * Pure 5-tier precedence resolution (AGENTS.MD §2.3):
 * Built-in defaults -> Global prefs -> Active profile -> Site override -> Session override
 */
export function resolveSettings(ctx: ResolveContext): EffectiveSettings {
  let effective = applyPatch(BUILTIN_DEFAULTS, ctx.globalPatch);
  effective = applyPatch(effective, ctx.profilePatch);
  effective = applyPatch(effective, ctx.sitePatch);
  effective = applyPatch(effective, ctx.sessionPatch);
  return effective;
}
