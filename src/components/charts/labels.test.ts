import { describe, expect, it } from "vitest";
import { MockSource } from "@/features/metrics/source";
import { inside, intersects } from "./labels";
import { scatterLayout } from "./Scatter";

const SEEDS = ["Incorporadora Sul", "Loja Verde", "Construtora Norte", "Residencial Aurora", "Vila Nova Imóveis", "Grupo Horizonte"];

describe("rótulos da dispersão", () => {
  for (const seed of SEEDS) {
    for (const [W, H, fs] of [
      [440, 300, 11],
      [320, 160, 8.5],
      [300, 220, 11],
    ] as const) {
      it(`${seed} em ${W}×${H}: rótulos dentro do gráfico e sem sobreposição`, () => {
        const ds = MockSource.load({ seed, profile: "imob", sources: ["meta", "google"], days: 28 });
        const { plot, dots, qLabel, pLabel } = scatterLayout(ds.projects, W, H, fs);
        const dotRects = dots.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: d.r * 2, h: d.r * 2 }));
        expect(inside(qLabel, plot)).toBe(true);
        expect(pLabel).not.toBeNull();
        expect(inside(pLabel!, plot)).toBe(true);
        expect(intersects(pLabel!, qLabel, 0)).toBe(false);
        for (const r of dotRects) expect(intersects(pLabel!, r, 0)).toBe(false);
        // o rótulo do quadrante não cobre o ponto ruim
        const bad = dots.find((d) => d.bad)!;
        expect(intersects(qLabel, { x: bad.cx - bad.r, y: bad.cy - bad.r, w: bad.r * 2, h: bad.r * 2 }, 0)).toBe(false);
      });
    }
  }
});
