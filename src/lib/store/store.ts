// Rascunhos de fluxos e preferências deste navegador (localStorage), atrás
// de uma interface. Dados do produto (contas, dashboards, landing pages,
// links, relatórios) moram no banco e chegam pelo servidor: não entram aqui.
// Nenhum componente acessa o localStorage direto; tudo passa por aqui.

/** Rascunhos (o fluxo continua de onde parou) e preferências locais. */
export type DocKey = "draft:dashboard" | "draft:landing" | `pref:${string}`;

export interface Store {
  getDoc<T>(key: DocKey): T | null;
  setDoc<T>(key: DocKey, value: T | null): void;
  /** Avisa quando qualquer dado muda (nesta aba ou em outra). */
  subscribe(listener: () => void): () => void;
}

const PREFIX = "vyz:v1:";

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

/** A instância usada pelo app (só no navegador; no servidor tudo vem vazio). */
export const store: Store = new LocalStore();
