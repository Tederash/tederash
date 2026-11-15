/**
 * Vault encryption at rest.
 *
 * The AES-GCM key is generated non-extractable and kept in IndexedDB, which stores
 * CryptoKey objects by structured clone: the key material cannot be read back out,
 * even by this extension, and it never lands in chrome.storage next to the ciphertext.
 *
 * Threat model: this protects the saved values on disk (the raw chrome.storage files,
 * another extension reading them) — it does not protect against code already running
 * inside this extension's own background context, which can simply call decryptJson.
 */

const DB_NAME = 'tederash-keys';
const DB_VERSION = 1;
const STORE = 'keys';
const KEY_ID = 'vault-aes-gcm-v1';
const IV_BYTES = 12;

export interface EncryptedPayload {
  v: 1;
  /** Base64 initialisation vector, fresh for every write. */
  iv: string;
  /** Base64 ciphertext. */
  data: string;
}

export function isEncryptedPayload(raw: unknown): raw is EncryptedPayload {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as Partial<EncryptedPayload>;
  return p.v === 1 && typeof p.iv === 'string' && typeof p.data === 'string';
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable, so the vault key cannot be stored.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the key database.'));
  });
}

function readKey(db: IDBDatabase): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_ID);
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not read the vault key.'));
  });
}

/** Writes only if absent, so two racing callers end up on the same key. */
function writeKeyIfAbsent(db: IDBDatabase, key: CryptoKey): Promise<CryptoKey> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const existing = store.get(KEY_ID);
    existing.onsuccess = () => {
      const found = existing.result as CryptoKey | undefined;
      if (found) {
        resolve(found);
        return;
      }
      store.put(key, KEY_ID);
      resolve(key);
    };
    tx.onerror = () => reject(tx.error ?? new Error('Could not save the vault key.'));
  });
}

let cached: Promise<CryptoKey> | null = null;

export async function getVaultKey(): Promise<CryptoKey> {
  if (!cached) {
    cached = (async () => {
      const db = await openDb();
      const existing = await readKey(db);
      if (existing) return existing;
      const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
      return writeKeyIfAbsent(db, generated);
    })();
    cached = cached.catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptJson(key: CryptoKey, payload: EncryptedPayload): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
