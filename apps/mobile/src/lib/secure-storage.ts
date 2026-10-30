// Sessão do Supabase no chaveiro do aparelho (Keychain no iOS, Keystore no
// Android). O SecureStore aceita ~2 KB por chave: a sessão é dividida em partes.

import * as SecureStore from "expo-secure-store";

const CHUNK = 1800;
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

export const secureStorage = {
  async getItem(key: string) {
    const k = safeKey(key);
    const count = Number(await SecureStore.getItemAsync(`${k}.n`, opts));
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`, opts)));
    return parts.some((p) => p === null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    const k = safeKey(key);
    await this.removeItem(key);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p, opts)));
    await SecureStore.setItemAsync(`${k}.n`, String(parts.length), opts);
  },
  async removeItem(key: string) {
    const k = safeKey(key);
    const count = Number(await SecureStore.getItemAsync(`${k}.n`, opts));
    await Promise.all(Array.from({ length: count || 0 }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`, opts)));
    await SecureStore.deleteItemAsync(`${k}.n`, opts);
  },
};
