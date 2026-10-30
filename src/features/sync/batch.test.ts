import { describe, expect, it } from "vitest";
import { chunk, runLimited, withRetry } from "./batch";

const tick = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

describe("lotes e concorrência", () => {
  it("divide em lotes do tamanho pedido", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 1000)).toEqual([]);
    expect(chunk(Array.from({ length: 2500 }, (_, i) => i), 1000).map((c) => c.length)).toEqual([1000, 1000, 500]);
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });

  it("nunca passa do limite de tarefas ao mesmo tempo e devolve na ordem", async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 12 }, (_, i) => async () => {
      running += 1;
      peak = Math.max(peak, running);
      await tick(1 + (i % 3));
      running -= 1;
      return i * 10;
    });
    expect(await runLimited(tasks, 3)).toEqual(Array.from({ length: 12 }, (_, i) => i * 10));
    expect(peak).toBe(3);
  });

  it("no primeiro erro não começa mais nenhuma e lança o erro", async () => {
    const started: number[] = [];
    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      started.push(i);
      await tick();
      if (i === 1) throw new Error("falhou o lote 1");
      return i;
    });
    await expect(runLimited(tasks, 2)).rejects.toThrow("falhou o lote 1");
    expect(started.length).toBeLessThanOrEqual(4);
  });

  it("tenta de novo só o que é passageiro", async () => {
    let calls = 0;
    const flaky = async () => {
      calls += 1;
      if (calls < 3) throw new Error("rede");
      return "ok";
    };
    expect(await withRetry(flaky, { retryable: () => true, delayMs: 0 })).toBe("ok");
    expect(calls).toBe(3);

    calls = 0;
    await expect(withRetry(flaky, { retryable: () => false, delayMs: 0 })).rejects.toThrow("rede");
    expect(calls).toBe(1);

    calls = -10;
    await expect(withRetry(flaky, { retryable: () => true, attempts: 2, delayMs: 0 })).rejects.toThrow("rede");
    expect(calls).toBe(-8);
  });
});
