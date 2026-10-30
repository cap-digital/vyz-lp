// Lotes, concorrência limitada e nova tentativa: gravar milhares de linhas
// sem abrir dezenas de requisições ao mesmo tempo no banco.

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!(size >= 1)) throw new RangeError("O tamanho do lote deve ser ao menos 1.");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Roda as tarefas com no máximo `limit` ao mesmo tempo, na ordem. No primeiro
 * erro, não começa mais nenhuma; espera as que já estão rodando e lança.
 * Resultados na ordem das tarefas.
 */
export async function runLimited<T>(tasks: readonly (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  const state = { next: 0, failed: false, error: undefined as unknown };
  const worker = async () => {
    while (!state.failed && state.next < tasks.length) {
      const i = state.next++;
      try {
        results[i] = await tasks[i]();
      } catch (error) {
        if (!state.failed) Object.assign(state, { failed: true, error });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
  if (state.failed) throw state.error;
  return results;
}

export type RetryOptions = {
  /** Tentativas no total (padrão: 3). */
  attempts?: number;
  /** Espera antes da 2ª tentativa; dobra a cada nova (padrão: 400 ms). */
  delayMs?: number;
  /** Só tenta de novo quando o erro é passageiro (rede, tempo esgotado...). */
  retryable: (error: unknown) => boolean;
};

/** Repete uma operação idempotente quando o erro é passageiro. */
export async function withRetry<T>(task: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delay = opts.delayMs ?? 400;
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts || !opts.retryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** (attempt - 1)));
    }
  }
}
