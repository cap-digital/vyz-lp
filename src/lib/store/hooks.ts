"use client";

import { useSyncExternalStore } from "react";
import { store, type DocKey } from "./store";

const subscribe = (cb: () => void) => store.subscribe(cb);

/** Rascunho ou preferência local. No servidor (e na hidratação) é null. */
export function useDoc<T>(key: DocKey): T | null {
  return useSyncExternalStore(
    subscribe,
    () => store.getDoc<T>(key),
    () => null,
  );
}
