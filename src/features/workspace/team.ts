// Regras da equipe (convites, papéis e remoção). Puro: a tela usa para mostrar
// só o que a pessoa pode fazer; o servidor repete as mesmas regras antes de
// gravar (e o banco ainda guarda o último dono).

import { hasRole, type MemberRole } from "./session";

/** Validade do convite (o banco aceita no máximo 30 dias). */
export const INVITE_TTL_DAYS = 7;
export const INVITE_MAX_PENDING = 50;

/** Papéis que se pode dar num convite (dono só por transferência). */
export const INVITE_ROLES = ["viewer", "member", "admin"] as const satisfies readonly MemberRole[];
export type InviteRole = (typeof INVITE_ROLES)[number];

export const ROLE_HINT: Record<MemberRole, string> = {
  viewer: "Vê dashboards e landing pages.",
  member: "Cria e edita dashboards, landing pages, links e relatórios.",
  admin: "Também cuida de contas, conexões, equipe, marca e leads.",
  owner: "Também cuida da cobrança e do plano.",
};

/** Papéis que quem age pode dar a um membro (vazio = não pode mexer nele). */
export function assignableRoles(actor: MemberRole, target: MemberRole): MemberRole[] {
  if (actor === "owner") return ["viewer", "member", "admin", "owner"];
  if (actor === "admin" && target !== "owner") return ["viewer", "member", "admin"];
  return [];
}

export type RoleChangeCheck = { ok: true } | { ok: false; reason: "forbidden" | "same" | "last_owner" };

/** Confere uma troca de papel. owners = quantos donos o workspace tem hoje. */
export function checkRoleChange(input: { actor: MemberRole; target: MemberRole; next: MemberRole; owners: number }): RoleChangeCheck {
  const { actor, target, next, owners } = input;
  if (target === next) return { ok: false, reason: "same" };
  if (!assignableRoles(actor, target).includes(next)) return { ok: false, reason: "forbidden" };
  if (target === "owner" && owners <= 1) return { ok: false, reason: "last_owner" };
  return { ok: true };
}

/** Quem age pode remover o membro? (O mesmo que o RLS: admin remove quem não é dono; dono remove qualquer um.) */
export function canRemoveMember(input: { actor: MemberRole; target: MemberRole; isSelf: boolean; owners: number }): boolean {
  const { actor, target, isSelf, owners } = input;
  if (target === "owner" && owners <= 1) return false;
  if (isSelf) return false;
  if (actor === "owner") return true;
  return hasRole(actor, "admin") && target !== "owner";
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Caminho do convite (o token só aparece aqui e no e-mail). */
export const invitePath = (token: string) => `/convite/${token}`;

/** Formato do token: 32 bytes em base64url (43 caracteres). */
export const isInviteToken = (v: string) => /^[A-Za-z0-9_-]{43}$/.test(v);
