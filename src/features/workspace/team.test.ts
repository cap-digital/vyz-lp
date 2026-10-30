import { describe, expect, it } from "vitest";
import { assignableRoles, canRemoveMember, checkRoleChange, isInviteToken } from "./team";

describe("papéis", () => {
  it("admin não mexe em dono nem dá posse", () => {
    expect(assignableRoles("admin", "owner")).toEqual([]);
    expect(assignableRoles("admin", "member")).toEqual(["viewer", "member", "admin"]);
    expect(assignableRoles("member", "viewer")).toEqual([]);
    expect(assignableRoles("owner", "admin")).toContain("owner");
  });

  it("confere a troca", () => {
    expect(checkRoleChange({ actor: "admin", target: "member", next: "admin", owners: 1 })).toEqual({ ok: true });
    expect(checkRoleChange({ actor: "admin", target: "member", next: "owner", owners: 1 })).toEqual({ ok: false, reason: "forbidden" });
    expect(checkRoleChange({ actor: "owner", target: "owner", next: "admin", owners: 1 })).toEqual({ ok: false, reason: "last_owner" });
    expect(checkRoleChange({ actor: "owner", target: "owner", next: "admin", owners: 2 })).toEqual({ ok: true });
    expect(checkRoleChange({ actor: "owner", target: "viewer", next: "viewer", owners: 1 })).toEqual({ ok: false, reason: "same" });
  });

  it("remoção segue o RLS e guarda o último dono", () => {
    expect(canRemoveMember({ actor: "admin", target: "member", isSelf: false, owners: 1 })).toBe(true);
    expect(canRemoveMember({ actor: "admin", target: "owner", isSelf: false, owners: 2 })).toBe(false);
    expect(canRemoveMember({ actor: "owner", target: "owner", isSelf: false, owners: 2 })).toBe(true);
    expect(canRemoveMember({ actor: "owner", target: "owner", isSelf: false, owners: 1 })).toBe(false);
    expect(canRemoveMember({ actor: "member", target: "viewer", isSelf: false, owners: 1 })).toBe(false);
    expect(canRemoveMember({ actor: "owner", target: "admin", isSelf: true, owners: 1 })).toBe(false);
  });

  it("token do convite", () => {
    expect(isInviteToken("a".repeat(43))).toBe(true);
    expect(isInviteToken("a".repeat(42))).toBe(false);
    expect(isInviteToken(`${"a".repeat(42)}/`)).toBe(false);
  });
});
