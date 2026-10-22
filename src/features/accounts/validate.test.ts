import { describe, expect, it } from "vitest";
import { validateTracking } from "@/features/landing-pages/tracking";
import { maskId, validateId } from "./validate";

describe("IDs de conta", () => {
  it("Meta: aceita só dígitos e normaliza com act_", () => {
    expect(validateId("metaAccount", "1234567890")).toEqual({ ok: true, value: "act_1234567890" });
    expect(validateId("metaAccount", "act_1234567890")).toEqual({ ok: true, value: "act_1234567890" });
    expect(validateId("metaAccount", "act_12ab").ok).toBe(false);
    expect(maskId("metaAccount", "act_12 34x5")).toBe("act_12345");
  });

  it("BM do Meta: só dígitos", () => {
    expect(validateId("metaBusiness", "123456789012345").ok).toBe(true);
    expect(validateId("metaBusiness", "12-34").ok).toBe(false);
  });

  it("Google Ads: 123-456-7890, com ou sem hífen", () => {
    expect(validateId("googleCustomer", "1234567890")).toEqual({ ok: true, value: "123-456-7890" });
    expect(validateId("googleCustomer", "123-456-7890").ok).toBe(true);
    expect(validateId("googleCustomer", "123-456-789").ok).toBe(false);
    expect(maskId("googleCustomer", "12345678901")).toBe("123-456-7890");
  });

  it("GA4: propriedade em dígitos e medição G-", () => {
    expect(validateId("ga4Property", "312345678").ok).toBe(true);
    expect(validateId("ga4Property", "G-123").ok).toBe(false);
    expect(validateId("ga4Measurement", "g-abc1234567")).toEqual({ ok: true, value: "G-ABC1234567" });
    expect(maskId("ga4Measurement", "abc12")).toBe("G-ABC12");
  });
});

describe("IDs de rastreamento da LP", () => {
  it("vazio passa; formatos certos passam; errados não", () => {
    expect(validateTracking("gtm", "")).toBeNull();
    expect(validateTracking("gtm", "gtm-abc1234")).toBeNull();
    expect(validateTracking("gtm", "GTM-1")).not.toBeNull();
    expect(validateTracking("pixel", "123456789012345")).toBeNull();
    expect(validateTracking("pixel", "123")).not.toBeNull();
    expect(validateTracking("adsConversion", "AW-123456789/AbCdEf")).toBeNull();
    expect(validateTracking("adsConversion", "AW-123")).not.toBeNull();
    expect(validateTracking("ga4", "G-ABC1234567")).toBeNull();
  });
});
