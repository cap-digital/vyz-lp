import { describe, expect, it } from "vitest";
import { googleStatusFrom } from "./google";
import { noticeFor } from "./messages";
import { amrMethods, isRecentRecovery, RECOVERY_WINDOW_SECONDS } from "./recovery";

const NOW = 1_800_000_000;

describe("sessão de recuperação", () => {
  it("vale para link de e-mail aberto há pouco", () => {
    expect(isRecentRecovery([{ method: "recovery", timestamp: NOW - 60 }], NOW)).toBe(true);
    expect(isRecentRecovery([{ method: "otp", timestamp: NOW }], NOW)).toBe(true);
    expect(isRecentRecovery([{ method: "invite", timestamp: NOW - RECOVERY_WINDOW_SECONDS }], NOW)).toBe(true);
  });

  it("não vale para quem entrou com senha ou Google, nem depois do prazo", () => {
    expect(isRecentRecovery([{ method: "password", timestamp: NOW }], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "oauth", timestamp: NOW }], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "recovery", timestamp: NOW - RECOVERY_WINDOW_SECONDS - 1 }], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "recovery", timestamp: NOW + 3600 }], NOW)).toBe(false);
    expect(isRecentRecovery([{ method: "recovery" }], NOW)).toBe(false);
  });

  it("lista os métodos nos dois formatos", () => {
    expect(amrMethods([{ method: "oauth", timestamp: NOW }, "otp", { foo: 1 }, null])).toEqual(["oauth", "otp"]);
    expect(amrMethods(undefined)).toEqual([]);
  });

  it("aceita o formato RFC 8176 e recusa lixo", () => {
    expect(isRecentRecovery(["otp"], NOW)).toBe(true);
    expect(isRecentRecovery(["password"], NOW)).toBe(false);
    expect(isRecentRecovery(undefined, NOW)).toBe(false);
    expect(isRecentRecovery("recovery", NOW)).toBe(false);
    expect(isRecentRecovery([null, 42], NOW)).toBe(false);
  });
});

describe("Google no Supabase", () => {
  it("lê external.google das configurações públicas", () => {
    expect(googleStatusFrom({ external: { google: true, email: true } })).toBe("enabled");
    expect(googleStatusFrom({ external: { google: false, email: true } })).toBe("disabled");
    expect(googleStatusFrom({ external: {} })).toBe("disabled");
    expect(googleStatusFrom({ msg: "Invalid API key" })).toBe("unknown");
    expect(googleStatusFrom(null)).toBe("unknown");
  });
});

describe("avisos da URL", () => {
  it("só códigos conhecidos, com o texto daqui", () => {
    expect(noticeFor("link_invalido")).toMatchObject({ code: "link_invalido", tone: "error" });
    expect(noticeFor("sessoes_encerradas")?.tone).toBe("info");
    expect(noticeFor("<script>alert(1)</script>")).toBeNull();
    expect(noticeFor("toString")).toBeNull();
    expect(noticeFor(undefined)).toBeNull();
  });
});
