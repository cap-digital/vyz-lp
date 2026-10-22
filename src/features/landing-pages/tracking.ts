// Validação dos IDs de rastreamento da landing page. Campos vazios passam
// (rastreamento é opcional); preenchidos, precisam do formato certo.

export type TrackingKey = "gtm" | "pixel" | "adsConversion" | "ga4";

export const TRACKING_FIELDS: { key: TrackingKey; label: string; placeholder: string; hint: string }[] = [
  { key: "gtm", label: "Google Tag Manager", placeholder: "GTM-ABC1234", hint: "Container do GTM (GTM-XXXXXXX)." },
  { key: "pixel", label: "Pixel da Meta", placeholder: "123456789012345", hint: "Só dígitos (15 ou 16)." },
  { key: "adsConversion", label: "Conversão do Google Ads", placeholder: "AW-123456789/AbCdEf", hint: "AW- seguido do ID e do rótulo, separados por /." },
  { key: "ga4", label: "GA4", placeholder: "G-ABC1234567", hint: "ID de medição (G-XXXXXXX)." },
];

export function normalizeTracking(key: TrackingKey, raw: string): string {
  const v = raw.trim();
  if (key === "pixel") return v.replace(/\D/g, "").slice(0, 16);
  if (key === "adsConversion") return v.replace(/\s/g, "").replace(/^aw-/i, "AW-");
  return v.toUpperCase().replace(/\s/g, "");
}

export function validateTracking(key: TrackingKey, raw: string): string | null {
  const v = normalizeTracking(key, raw);
  if (!v) return null;
  switch (key) {
    case "gtm":
      return /^GTM-[A-Z0-9]{6,8}$/.test(v) ? null : "Use o formato GTM-XXXXXXX.";
    case "pixel":
      return /^\d{15,16}$/.test(v) ? null : "O Pixel tem 15 ou 16 dígitos.";
    case "adsConversion":
      return /^AW-\d{9,11}\/[A-Za-z0-9_-]{4,}$/.test(v) ? null : "Use AW-123456789/rótulo.";
    case "ga4":
      return /^G-[A-Z0-9]{6,12}$/.test(v) ? null : "Use o formato G-XXXXXXX.";
  }
}
