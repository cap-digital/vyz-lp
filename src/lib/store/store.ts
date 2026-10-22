// Persistência atrás de uma interface. Hoje: LocalStore (localStorage).
// Depois: SupabaseStore com a mesma interface. Nenhum componente acessa o
// localStorage direto; tudo passa por aqui.

export type Collection = "accounts" | "dashboards" | "landingPages" | "shareLinks" | "reports" | "exports";
export type DocKey = "workspace" | "draft:dashboard" | "draft:landing";

export type Entity = { id: string };

export interface Store {
  list<T extends Entity>(col: Collection): T[];
  get<T extends Entity>(col: Collection, id: string): T | null;
  put<T extends Entity>(col: Collection, item: T): void;
  remove(col: Collection, id: string): void;
  getDoc<T>(key: DocKey): T | null;
  setDoc<T>(key: DocKey, value: T | null): void;
  /** Avisa quando qualquer dado muda (nesta aba ou em outra). */
  subscribe(listener: () => void): () => void;
}

const PREFIX = "vyz:v1:";
const EMPTY: never[] = [];

/** localStorage com versão no prefixo, try/catch em tudo e cache de leitura (referências estáveis). */
export class LocalStore implements Store {
  private cache = new Map<string, { raw: string | null; value: unknown }>();
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key?.startsWith(PREFIX)) this.emit();
      });
    }
  }

  private read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(PREFIX + key);
    } catch {
      return fallback;
    }
    const hit = this.cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    let value: T = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    this.cache.set(key, { raw, value });
    return value;
  }

  private write(key: string, value: unknown) {
    try {
      if (value === null) window.localStorage.removeItem(PREFIX + key);
      else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // cheio, bloqueado ou modo privado: segue sem persistir
    }
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  list<T extends Entity>(col: Collection): T[] {
    return this.read<T[]>(col, EMPTY as T[]);
  }

  get<T extends Entity>(col: Collection, id: string): T | null {
    return this.list<T>(col).find((x) => x.id === id) ?? null;
  }

  put<T extends Entity>(col: Collection, item: T): void {
    const items = this.list<T>(col);
    const i = items.findIndex((x) => x.id === item.id);
    const next = i >= 0 ? items.map((x) => (x.id === item.id ? item : x)) : [item, ...items];
    this.write(col, next);
  }

  remove(col: Collection, id: string): void {
    this.write(
      col,
      this.list(col).filter((x) => x.id !== id),
    );
  }

  getDoc<T>(key: DocKey): T | null {
    return this.read<T | null>(key, null);
  }

  setDoc<T>(key: DocKey, value: T | null): void {
    this.write(key, value);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** A instância usada pelo app. Trocar por SupabaseStore quando houver backend. */
export const store: Store = new LocalStore();
