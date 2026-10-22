"use client";

import { useSyncExternalStore } from "react";
import { store, type Collection, type DocKey, type Entity } from "./store";

const subscribe = (cb: () => void) => store.subscribe(cb);
const NONE: never[] = [];

/** Lista de uma coleção. No servidor (e na hidratação) é vazia. */
export function useCollection<T extends Entity>(col: Collection): T[] {
  return useSyncExternalStore(
    subscribe,
    () => store.list<T>(col),
    () => NONE as T[],
  );
}

export function useItem<T extends Entity>(col: Collection, id: string): T | null | undefined {
  // undefined = ainda hidratando; null = não existe
  const items = useSyncExternalStore(
    subscribe,
    () => store.list<T>(col),
    () => null,
  );
  if (items === null) return undefined;
  return items.find((x) => x.id === id) ?? null;
}

export function useDoc<T>(key: DocKey): T | null {
  return useSyncExternalStore(
    subscribe,
    () => store.getDoc<T>(key),
    () => null,
  );
}
