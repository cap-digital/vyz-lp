import { describe, expect, it } from "vitest";
import { dateIn, expiresAtFrom, isShareToken, linkStatus, tokenHint } from "./links";
import { nextRunAt, normalizePhone, parseRecipients, scheduleLabel } from "./schedule";

describe("links", () => {
  it("token: 43 caracteres base64url", () => {
    const token = "A".repeat(40) + "_-9";
    expect(isShareToken(token)).toBe(true);
    expect(isShareToken(token.slice(1))).toBe(false);
    expect(isShareToken(token.slice(1) + "=")).toBe(false);
    expect(isShareToken(undefined)).toBe(false);
    expect(tokenHint(token)).toBe("AAA_-9");
  });

  it("validade e situação", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(expiresAtFrom("nunca", now)).toBeNull();
    expect(expiresAtFrom("7", now)).toBe("2026-11-06T12:00:00.000Z");
    expect(linkStatus({ revokedAt: null, expiresAt: null }, now)).toBe("active");
    expect(linkStatus({ revokedAt: null, expiresAt: "2026-10-30T12:00:00Z" }, now)).toBe("expired");
    expect(linkStatus({ revokedAt: "2026-10-01T00:00:00Z", expiresAt: "2027-01-01T00:00:00Z" }, now)).toBe("revoked");
  });
});

describe("destinatários", () => {
  it("e-mails: separa, normaliza e tira repetidos", () => {
    expect(parseRecipients("Cliente@Loja.com; gestor@agencia.com\ncliente@loja.com", "pdf")).toEqual({
      ok: true,
      recipients: [
        { channel: "email", address: "cliente@loja.com" },
        { channel: "email", address: "gestor@agencia.com" },
      ],
    });
    expect(parseRecipients("cliente@", "pdf").ok).toBe(false);
    expect(parseRecipients("  ", "pdf").ok).toBe(false);
  });

  it("WhatsApp: DDD vira +55; número curto é recusado", () => {
    expect(normalizePhone("(71) 99999-0000")).toBe("+5571999990000");
    expect(normalizePhone("+1 415 555 0100")).toBe("+14155550100");
    expect(normalizePhone("9999-0000")).toBeNull();
    expect(parseRecipients("71 99999-0000, 11 3333-4444", "whatsapp")).toEqual({
      ok: true,
      recipients: [
        { channel: "whatsapp", address: "+5571999990000" },
        { channel: "whatsapp", address: "+551133334444" },
      ],
    });
    expect(parseRecipients("cliente@loja.com", "whatsapp").ok).toBe(false);
  });

  it("no máximo 10", () => {
    expect(parseRecipients(Array.from({ length: 11 }, (_, i) => `a${i}@b.co`).join(","), "pdf").ok).toBe(false);
  });
});

describe("próximo envio", () => {
  const tz = "America/Sao_Paulo";
  // 30/10/2026 é sexta; 12:00Z = 09:00 em São Paulo
  const now = new Date("2026-10-30T12:00:00Z");

  it("semanal: próxima segunda às 8h locais (11h UTC)", () => {
    expect(nextRunAt({ frequency: "weekly", weekday: 1, monthDay: null, sendHour: 8, timeZone: tz }, now).toISOString()).toBe("2026-11-02T11:00:00.000Z");
  });

  it("semanal no mesmo dia: hoje se a hora ainda não passou, senão daqui a 7 dias", () => {
    expect(nextRunAt({ frequency: "weekly", weekday: 5, monthDay: null, sendHour: 18, timeZone: tz }, now).toISOString()).toBe("2026-10-30T21:00:00.000Z");
    expect(nextRunAt({ frequency: "weekly", weekday: 5, monthDay: null, sendHour: 8, timeZone: tz }, now).toISOString()).toBe("2026-11-06T11:00:00.000Z");
  });

  it("mensal: vira o mês quando o dia já passou", () => {
    expect(nextRunAt({ frequency: "monthly", weekday: null, monthDay: 5, sendHour: 8, timeZone: tz }, now).toISOString()).toBe("2026-11-05T11:00:00.000Z");
    expect(nextRunAt({ frequency: "monthly", weekday: null, monthDay: 28, sendHour: 0, timeZone: "UTC" }, new Date("2026-12-28T00:00:00Z")).toISOString()).toBe("2027-01-28T00:00:00.000Z");
  });

  it("rótulo", () => {
    expect(scheduleLabel({ frequency: "weekly", weekday: 1, monthDay: null, sendHour: 8 })).toBe("Toda segunda, às 8h");
    expect(scheduleLabel({ frequency: "weekly", weekday: 0, monthDay: null, sendHour: 9 })).toBe("Todo domingo, às 9h");
    expect(scheduleLabel({ frequency: "monthly", weekday: null, monthDay: 5, sendHour: 8 })).toBe("Todo dia 5, às 8h");
  });
});

describe("dateIn", () => {
  it("formata no fuso pedido", () => {
    expect(dateIn("2026-10-30T02:00:00Z", "America/Sao_Paulo")).toBe("29/10/2026");
    expect(dateIn("2026-10-30T02:00:00Z", "UTC")).toBe("30/10/2026");
  });
});
