import { describe, expect, it } from "vitest";
import { addDays, dateRange, dayNumber, diffDays, fromDayNumber, isIsoDate, localDate, syncRange, weekday } from "./dates";

describe("datas de calendário", () => {
  it("valida YYYY-MM-DD de verdade", () => {
    expect(isIsoDate("2026-10-28")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("28/10/2026")).toBe(false);
    expect(isIsoDate(20261028)).toBe(false);
    expect(() => dayNumber("ontem")).toThrow(RangeError);
  });

  it("soma dias atravessando mês, ano e bissexto", () => {
    expect(addDays("2026-10-28", 4)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(diffDays("2026-07-31", "2026-10-28")).toBe(89);
    expect(fromDayNumber(dayNumber("2026-10-28"))).toBe("2026-10-28");
  });

  it("dia da semana (0 = domingo)", () => {
    expect(weekday("2026-10-25")).toBe(0);
    expect(weekday("2026-10-28")).toBe(3);
    expect(weekday("1969-12-31")).toBe(3);
  });

  it("período termina no dia pedido, do mais antigo ao mais novo", () => {
    expect(dateRange("2026-10-28", 3)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
    expect(dateRange("2026-10-28", 90)).toHaveLength(90);
    expect(dateRange("2026-10-28", 90)[0]).toBe("2026-07-31");
  });

  it("o dia de hoje sai do fuso da conta", () => {
    const now = new Date("2026-10-30T01:10:00Z");
    expect(localDate(now, "America/Sao_Paulo")).toBe("2026-10-29");
    expect(localDate(now, "UTC")).toBe("2026-10-30");
    expect(localDate(now, "Fuso/Inexistente")).toBe("2026-10-29");
  });
});

describe("intervalo da sincronização", () => {
  const now = new Date("2026-10-30T01:10:00Z"); // 29/10, 22h10 em São Paulo

  it("primeira: 90 dias até ontem, no fuso da conta", () => {
    expect(syncRange("initial", { now, timeZone: "America/Sao_Paulo" })).toEqual({ from: "2026-07-31", to: "2026-10-28", days: 90 });
  });

  it("agendada e manual: os últimos 7 dias até ontem", () => {
    expect(syncRange("scheduled", { now, timeZone: "America/Sao_Paulo" })).toEqual({ from: "2026-10-22", to: "2026-10-28", days: 7 });
    expect(syncRange("manual", { now, timeZone: "UTC" })).toEqual({ from: "2026-10-23", to: "2026-10-29", days: 7 });
  });
});
