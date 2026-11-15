import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decryptJson,
  encryptJson,
  getVaultKey,
  isEncryptedPayload,
} from '../../src/extension/background/storage/crypto';
import { storageService } from '../../src/extension/background/storage/service';

const VAULT_KEY = 'tederash_vault_v1';

function installChromeStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
      },
    },
  };
  return store;
}

describe('vault encryption', () => {
  it('round-trips an object through encrypt/decrypt', async () => {
    const key = await getVaultKey();
    const payload = await encryptJson(key, { fullName: 'Abebe Bikila', email: 'abebe@example.com' });

    expect(isEncryptedPayload(payload)).toBe(true);
    expect(await decryptJson(key, payload)).toEqual({
      fullName: 'Abebe Bikila',
      email: 'abebe@example.com',
    });
  });

  it('round-trips Ge’ez text', async () => {
    const key = await getVaultKey();
    const payload = await encryptJson(key, { fullName: 'አበበ ቢቂላ' });
    expect(await decryptJson(key, payload)).toEqual({ fullName: 'አበበ ቢቂላ' });
  });

  it('uses a fresh IV per write, so the same value does not produce the same ciphertext', async () => {
    const key = await getVaultKey();
    const a = await encryptJson(key, { email: 'same@example.com' });
    const b = await encryptJson(key, { email: 'same@example.com' });

    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    expect(await decryptJson(key, b)).toEqual({ email: 'same@example.com' });
  });

  it('reuses the stored key across calls', async () => {
    expect(await getVaultKey()).toBe(await getVaultKey());
  });

  it('rejects anything that is not an encrypted payload', () => {
    expect(isEncryptedPayload({ fullName: 'Abebe' })).toBe(false);
    expect(isEncryptedPayload({ v: 2, iv: 'a', data: 'b' })).toBe(false);
    expect(isEncryptedPayload(null)).toBe(false);
  });
});

describe('StorageService vault', () => {
  beforeEach(() => {
    installChromeStorage();
  });

  it('stores entries encrypted, never as readable values', async () => {
    const store = installChromeStorage();
    await storageService.setVault({ fullName: 'Abebe Bikila', email: 'abebe@example.com' });

    const raw = store[VAULT_KEY];
    expect(isEncryptedPayload(raw)).toBe(true);
    expect(JSON.stringify(raw)).not.toContain('Abebe');
    expect(JSON.stringify(raw)).not.toContain('abebe@example.com');
  });

  it('reads back what it wrote', async () => {
    await storageService.setVault({ fullName: 'Abebe Bikila', phone: '+251911000000' });
    expect(await storageService.getVault()).toEqual({
      fullName: 'Abebe Bikila',
      phone: '+251911000000',
    });
  });

  it('drops empty values and trims the rest', async () => {
    await storageService.setVault({ fullName: '  Abebe  ', email: '', phone: '   ' });
    expect(await storageService.getVault()).toEqual({ fullName: 'Abebe' });
  });

  it('returns an empty vault when nothing is stored', async () => {
    expect(await storageService.getVault()).toEqual({});
  });

  it('reads a pre-encryption plaintext vault, then re-saves it encrypted', async () => {
    const store = installChromeStorage({ [VAULT_KEY]: { fullName: 'Legacy User', email: 'legacy@example.com' } });

    expect(await storageService.getVault()).toEqual({
      fullName: 'Legacy User',
      email: 'legacy@example.com',
    });

    await storageService.mergeVaultEntries({ phone: '+251911000000' });

    expect(isEncryptedPayload(store[VAULT_KEY])).toBe(true);
    expect(await storageService.getVault()).toEqual({
      fullName: 'Legacy User',
      email: 'legacy@example.com',
      phone: '+251911000000',
    });
  });

  it('mergeVaultEntries adds and updates without dropping the rest', async () => {
    await storageService.setVault({ fullName: 'Abebe Bikila', email: 'old@example.com' });
    await storageService.mergeVaultEntries({ email: 'new@example.com', phone: '+251911000000' });

    expect(await storageService.getVault()).toEqual({
      fullName: 'Abebe Bikila',
      email: 'new@example.com',
      phone: '+251911000000',
    });
  });

  it('mergeVaultEntries ignores blank values instead of wiping saved ones', async () => {
    await storageService.setVault({ fullName: 'Abebe Bikila' });
    await storageService.mergeVaultEntries({ fullName: '   ', email: '' });

    expect(await storageService.getVault()).toEqual({ fullName: 'Abebe Bikila' });
  });

  it('setVault replaces the whole vault, as the dashboard expects', async () => {
    await storageService.setVault({ fullName: 'Abebe Bikila', phone: '+251911000000' });
    await storageService.setVault({ fullName: 'Abebe Bikila' });

    expect(await storageService.getVault()).toEqual({ fullName: 'Abebe Bikila' });
  });
});
