import { describe, expect, it } from "vitest";
import { csvCell, csvRow, leadCsvHeader, leadCsvLine, leadFiltersQuery, mergeFieldLabels, parseLeadFilters, periodStart, stringRecord } from "./leads";

describe("csvCell", () => {
  it("deixa texto simples como está", () => {
    expect(csvCell("Maria")).toBe("Maria");
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("põe entre aspas e dobra aspas quando precisa", () => {
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell("linha\nnova")).toBe('"linha\nnova"');
    expect(csvCell(" espaço ")).toBe('" espaço "');
  });

  it("neutraliza fórmulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+5511999")).toBe("'+5511999");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\t=1")).toBe("'\t=1");
    expect(csvCell("\r=1")).toBe("\"'\r=1\"");
  });

  it("tira caracteres de controle", () => {
    expect(csvCell("a\u0000b\u0007c")).toBe("abc");
  });
});

describe("linhas", () => {
  it("monta cabeçalho e linha com campos conhecidos e outros", () => {
    expect(csvRow(["a", "b"])).toBe("a;b\r\n");
    const fields = ["Nome", "E-mail"];
    expect(leadCsvHeader(fields).startsWith("Recebido em;Landing page;Nome;E-mail;Outros campos;utm_source")).toBe(true);
    const line = leadCsvLine(
      { createdAt: "2026-10-01T15:00:00Z", landingName: "Promo", data: { Nome: "Ana", Cidade: "Recife" }, utm: { utm_source: "meta" }, referrer: null },
      fields,
      "America/Sao_Paulo",
    );
    expect(line).toBe("01/10/2026 12:00:00;Promo;Ana;;Cidade: Recife;meta;;;;;;;\r\n");
  });

  it("junta rótulos sem repetir", () => {
    expect(mergeFieldLabels([["Nome", "E-mail"], ["E-mail", "WhatsApp"]])).toEqual(["Nome", "E-mail", "WhatsApp"]);
  });

  it("lê só texto do jsonb", () => {
    expect(stringRecord({ a: "1", b: 2, c: null })).toEqual({ a: "1" });
    expect(stringRecord([1])).toEqual({});
  });
});

describe("filtros", () => {
  it("lê a URL com tolerância", () => {
    expect(parseLeadFilters({})).toEqual({ landingPageId: null, period: "30d", page: 1 });
    expect(parseLeadFilters({ lp: "nada", periodo: "1a", pagina: "-3" })).toEqual({ landingPageId: null, period: "30d", page: 1 });
    const id = "6f1c1b7e-8a5e-4c1e-9a7a-0b2d3c4e5f60";
    expect(parseLeadFilters(new URLSearchParams(`lp=${id}&periodo=7d&pagina=3`))).toEqual({ landingPageId: id, period: "7d", page: 3 });
  });

  it("escreve a query sem os padrões", () => {
    expect(leadFiltersQuery({ period: "30d", page: 1 })).toBe("");
    expect(leadFiltersQuery({ period: "tudo", page: 2 })).toBe("?periodo=tudo&pagina=2");
  });

  it("calcula o início do período", () => {
    const now = new Date("2026-10-30T00:00:00Z");
    expect(periodStart("7d", now)).toBe("2026-10-23T00:00:00.000Z");
    expect(periodStart("tudo", now)).toBeNull();
  });
});
