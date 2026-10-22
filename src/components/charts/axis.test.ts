import { describe, expect, it } from "vitest";
import { niceStep, xTickIndices, yTicks } from "./axis";

describe("eixos", () => {
  it("passo redondo", () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(7300, 4)).toBe(2000);
    expect(niceStep(0.9, 3)).toBe(0.5);
  });

  it("Y cobre o intervalo com ticks redondos", () => {
    const { lo, hi, ticks } = yTicks(4210, 9870, 160);
    expect(lo).toBeLessThanOrEqual(4210);
    expect(hi).toBeGreaterThanOrEqual(9870);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it("X: mais rótulos no largo, menos no estreito, sem encavalar", () => {
    const labelW = 32;
    for (const w of [220, 360, 600, 1000]) {
      const idx = xTickIndices(30, w, labelW);
      const slot = w / 29;
      expect(idx.at(-1)).toBe(29);
      for (let i = 1; i < idx.length; i++) expect((idx[i] - idx[i - 1]) * slot).toBeGreaterThanOrEqual(labelW + 14);
      expect(idx[0] * slot).toBeGreaterThanOrEqual(labelW / 2);
      // o último fica alinhado à direita: o penúltimo termina antes dele começar
      if (idx.length > 1) expect((idx.at(-1)! - idx.at(-2)!) * slot).toBeGreaterThanOrEqual(labelW * 1.5 + 14);
    }
    expect(xTickIndices(30, 1000, labelW).length).toBeGreaterThan(xTickIndices(30, 300, labelW).length);
  });
});
