import { describe, expect, it } from "vitest";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import {
  cleanSlug,
  columnsToTracking,
  contentSchema,
  parseSubmission,
  pickUtm,
  readStoredContent,
  slugCandidates,
  slugFromBrand,
  slugIssue,
  trackingToColumns,
  whatsappHref,
} from "./model";

const t = landingTemplate("captura-leads")!;
const defaults = landingDefaults(t, "Loja Verde");

describe("conteúdo", () => {
  it("corta textos longos, ignora seções desconhecidas e tira o logo", () => {
    const parsed = contentSchema.parse({
      ...defaults,
      logo: "data:image/png;base64,AAAA",
      headline: "x".repeat(200),
      sections: { faq: true, hack: true },
      fields: ["a", "b", "c", "d", "e"],
    });
    expect(parsed.headline).toHaveLength(90);
    expect(parsed.sections).toEqual({ faq: true });
    expect(parsed.fields).toHaveLength(4);
    expect("logo" in parsed).toBe(false);
  });

  it("recusa cor fora do formato", () => {
    expect(contentSchema.safeParse({ ...defaults, color: "red" }).success).toBe(false);
  });

  it("lê o jsonb do banco com tolerância e mantém o caminho do logo", () => {
    const c = readStoredContent({ headline: "Oi", logoPath: "ws/lp/1/logo.png", color: 12 }, defaults);
    expect(c.brand).toBe("Loja Verde");
    expect(c.logoPath).toBe("ws/lp/1/logo.png");
    expect(readStoredContent(null, defaults).headline).toBe(defaults.headline);
  });
});

describe("rastreamento", () => {
  it("normaliza e converte para as colunas", () => {
    const r = trackingToColumns({ gtm: " gtm-abc1234 ", pixel: "1234-5678-9012-345", adsConversion: "", ga4: "" });
    expect(r).toEqual({ ok: true, columns: { gtm_container_id: "GTM-ABC1234", meta_pixel_id: "123456789012345", google_ads_conversion: null, ga4_measurement_id: null } });
  });

  it("devolve erro por campo", () => {
    const r = trackingToColumns({ gtm: "GTM-1", ga4: "G-ABC1234" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields)).toEqual(["gtm"]);
  });

  it("volta para o formato do formulário", () => {
    expect(columnsToTracking({ gtm_container_id: "GTM-ABC1234", meta_pixel_id: null })).toEqual({ gtm: "GTM-ABC1234", pixel: "", adsConversion: "", ga4: "" });
  });
});

describe("endereço", () => {
  it("limpa enquanto digita", () => {
    expect(cleanSlug("Loja  Verde Ç!")).toBe("loja-verde-c-");
    expect(cleanSlug("--abc")).toBe("abc");
  });

  it("aponta formato, tamanho e reservados", () => {
    expect(slugIssue("loja-verde")).toBeNull();
    expect(slugIssue("ab")).not.toBeNull();
    expect(slugIssue("loja-")).not.toBeNull();
    expect(slugIssue("painel")).toMatch(/reservado/);
  });

  it("gera a partir da marca e sugere alternativas", () => {
    expect(slugFromBrand("Clínica Sol")).toBe("clinica-sol");
    expect(slugIssue(slugFromBrand("VYZ"))).toBeNull();
    expect(slugIssue(slugFromBrand(""))).toBeNull();
    expect(slugCandidates("loja-verde", 2)).toEqual(["loja-verde-2", "loja-verde-3"]);
  });
});

describe("formulário público", () => {
  const labels = ["Nome", "E-mail", "WhatsApp"];
  const form = (v: Record<string, string>) => (k: string) => v[k];

  it("usa os rótulos do banco e ignora campos a mais", () => {
    const r = parseSubmission(labels, form({ campo_0: " Ana ", campo_1: "ana@exemplo.com", campo_2: "(71) 99999-0000", campo_9: "x" }));
    expect(r).toEqual({ ok: true, data: { Nome: "Ana", "E-mail": "ana@exemplo.com", WhatsApp: "(71) 99999-0000" } });
  });

  it("confere e-mail e telefone", () => {
    const r = parseSubmission(labels, form({ campo_0: "Ana", campo_1: "ana@", campo_2: "123" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields).sort()).toEqual(["campo_1", "campo_2"]);
  });

  it("exige pelo menos um campo", () => {
    expect(parseSubmission(labels, form({})).ok).toBe(false);
  });

  it("não perde campos com o mesmo rótulo", () => {
    const r = parseSubmission(["Nome", "Nome"], form({ campo_0: "A", campo_1: "B" }));
    expect(r).toEqual({ ok: true, data: { Nome: "A", "Nome (2)": "B" } });
  });
});

describe("utm e WhatsApp", () => {
  it("pega só os parâmetros conhecidos", () => {
    expect(pickUtm("?utm_source=meta&utm_campaign=bf&x=1")).toEqual({ utm_source: "meta", utm_campaign: "bf" });
  });

  it("monta o link com DDI", () => {
    expect(whatsappHref("(71) 99999-0000")).toBe("https://wa.me/5571999990000");
    expect(whatsappHref("123")).toBeNull();
  });
});
