import { createInitialPersistedState } from './defaults';
import { PersistedStateSchema, type PersistedState } from './schema';

export function migratePersistedState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') {
    return createInitialPersistedState();
  }

  const parsed = PersistedStateSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  // Future schemaVersion upgrades (v1 -> v2, etc.) go here.
  return createInitialPersistedState();
}
