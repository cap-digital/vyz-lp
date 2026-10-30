import { describe, expect, it } from "vitest";
import { relativeTime, shortDate, syncSummary } from "./sync-label";
import type { LastSyncDTO } from "./types";

const NOW = "2026-10-29T15:00:00.000Z";
const run = (patch: Partial<LastSyncDTO>): LastSyncDTO => ({
  status: "succeeded",
  trigger: "manual",
  startedAt: null,
  finishedAt: null,
  rowsWritten: 0,
  error: null,
  createdAt: NOW,
  ...patch,
});

describe("datas relativas", () => {
  it("minutos, horas, dias e data", () => {
    expect(relativeTime("2026-10-29T14:59:30.000Z", NOW)).toBe("agora");
    expect(relativeTime("2026-10-29T14:55:00.000Z", NOW)).toBe("há 5 min");
    expect(relativeTime("2026-10-29T12:30:00.000Z", NOW)).toBe("há 2 h");
    expect(relativeTime("2026-10-28T14:00:00.000Z", NOW)).toBe("há 1 dia");
    expect(relativeTime("2026-10-25T15:00:00.000Z", NOW)).toBe("há 4 dias");
    expect(relativeTime("2026-10-10T15:00:00.000Z", NOW)).toBe("em 10/10/2026");
  });

  it("relógio adiantado não vira tempo negativo", () => {
    expect(relativeTime("2026-10-29T15:03:00.000Z", NOW)).toBe("agora");
  });

  it("data curta no fuso do workspace", () => {
    expect(shortDate("2026-10-30T01:00:00.000Z", "America/Sao_Paulo")).toBe("29/10/2026");
    expect(shortDate("2026-10-30T01:00:00.000Z", "UTC")).toBe("30/10/2026");
  });
});

describe("status da sincronização", () => {
  const base = { isEnabled: true, lastSyncedAt: null, lastSync: null };

  it("conta desligada e sem histórico não mostra nada", () => {
    expect(syncSummary({ ...base, isEnabled: false }, NOW)).toBeNull();
  });

  it("em andamento, falha, ok e aguardando", () => {
    expect(syncSummary({ ...base, lastSync: run({ status: "running", trigger: "initial" }) }, NOW)).toEqual({ tone: "running", label: "Importando os últimos 90 dias…" });
    expect(syncSummary({ ...base, lastSync: run({ status: "queued" }) }, NOW)?.tone).toBe("running");
    expect(syncSummary({ ...base, lastSync: run({ status: "failed", error: "Tempo esgotado" }) }, NOW)).toEqual({
      tone: "error",
      label: "A última sincronização falhou",
      detail: "Tempo esgotado",
    });
    expect(syncSummary({ ...base, lastSyncedAt: "2026-10-29T14:55:00.000Z", lastSync: run({}) }, NOW)).toEqual({ tone: "ok", label: "Sincronizada há 5 min" });
    expect(syncSummary(base, NOW)).toEqual({ tone: "idle", label: "Aguardando a primeira sincronização" });
  });
});
