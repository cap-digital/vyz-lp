// Textos do acesso que o servidor e a tela dividem, e os avisos que chegam
// pela URL (?erro= e ?aviso=). Da URL só vale código conhecido: o texto que
// aparece é sempre o daqui, nunca o que veio no link.

export const AUTH_MESSAGES = {
  invalidCredentials: "E-mail ou senha incorretos.",
  wrongCurrentPassword: "Senha atual incorreta.",
  passwordChanged: "Senha alterada. Os outros aparelhos conectados saíram da conta.",
  recoveryExpired: "Este link de redefinição já expirou. Peça um novo.",
} as const;

export type NoticeTone = "error" | "info";
export type Notice = { code: NoticeCode; message: string; tone: NoticeTone };

const NOTICES = {
  link_invalido: { tone: "error", message: "Este link expirou ou já foi usado. Peça um novo." },
  outro_navegador: { tone: "error", message: "Abra o link no mesmo navegador em que você pediu a nova senha, ou peça outro link." },
  google: { tone: "error", message: "Não deu para entrar com o Google. Tente de novo ou use e-mail e senha." },
  google_cancelado: { tone: "info", message: "Login com Google cancelado." },
  sessoes_encerradas: { tone: "info", message: "Você saiu da conta em todos os aparelhos." },
} as const satisfies Record<string, { tone: NoticeTone; message: string }>;

export type NoticeCode = keyof typeof NOTICES;

const isNoticeCode = (code: string): code is NoticeCode => Object.hasOwn(NOTICES, code);

/** Aviso para um código da URL; desconhecido = nenhum. */
export function noticeFor(code: string | null | undefined): Notice | null {
  if (!code || !isNoticeCode(code)) return null;
  return { code, ...NOTICES[code] };
}
