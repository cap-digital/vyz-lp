import { describe, expect, it } from "vitest";
import { apportion, apportionCapped } from "./apportion";

const total = (list: number[]) => list.reduce((a, b) => a + b, 0);

describe("divisão proporcional (maiores restos)", () => {
  it("soma exatamente o total e respeita a proporção", () => {
    expect(apportion(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(apportion(10, [3, 1])).toEqual([8, 2]);
    expect(apportion(7, [0.5, 0.25, 0.25])).toEqual([3, 2, 2]);
    for (const n of [0, 1, 99, 12_345, 987_654_321]) expect(total(apportion(n, [0.13, 2, 7.7, 0.001]))).toBe(n);
  });

  it("peso zero recebe zero; todos zero divide por igual", () => {
    expect(apportion(5, [0, 2, 0, 3])).toEqual([0, 2, 0, 3]);
    expect(apportion(1, [0, 0.0001])).toEqual([0, 1]);
    expect(apportion(4, [0, 0])).toEqual([2, 2]);
    expect(apportion(3, [Number.NaN, -1, 1])).toEqual([0, 0, 3]);
  });

  it("casos vazios", () => {
    expect(apportion(10, [])).toEqual([]);
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
  });

  it("com teto: ninguém passa do seu teto e o excesso vai para os outros", () => {
    expect(apportionCapped(10, [1, 1], [2, 100])).toEqual([2, 8]);
    expect(apportionCapped(10, [100, 1, 1], [3, 5, 5])).toEqual([3, 4, 3]);
    // peso zero só recebe quando os outros lotaram
    expect(apportionCapped(6, [1, 0], [4, 10])).toEqual([4, 2]);
    // tetos menores que o total: cada um no teto
    expect(apportionCapped(50, [1, 1], [3, 4])).toEqual([3, 4]);
    expect(apportionCapped(5, [1, 1], [0, 0])).toEqual([0, 0]);
  });

  it("com teto, ao acaso: soma o total e nunca estoura", () => {
    let seed = 7;
    const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let k = 0; k < 300; k++) {
      const n = 1 + Math.floor(next() * 12);
      const caps = Array.from({ length: n }, () => Math.floor(next() * 50));
      const weights = Array.from({ length: n }, () => (next() < 0.2 ? 0 : next() * 10));
      const want = Math.floor(next() * total(caps));
      const out = apportionCapped(want, weights, caps);
      expect(total(out)).toBe(want);
      out.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(caps[i]);
      });
    }
  });
});
