"use client";

import { useState } from "react";
import { LockBadge, PendingChip, SelectField, TextField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { availableIn, canUse } from "@/features/pricing/entitlements";
import type { Account } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { newId } from "@/lib/ids";
import { store } from "@/lib/store/store";
import { PLATFORM_ORDER, PLATFORMS, type PlatformId } from "./platforms";
import { maskId, validateId } from "./validate";

type AccountFormProps = {
  /** Plataforma fixa (no fluxo do dashboard) ou escolha livre. */
  platform?: PlatformId;
  account?: Account;
  onSaved: (a: Account) => void;
  onCancel?: () => void;
};

/** Cadastro de conta pelo ID, com máscara e validação de formato. */
export function AccountForm({ platform: fixed, account, onSaved, onCancel }: AccountFormProps) {
  const { ws } = useWorkspace();
  const [platform, setPlatform] = useState<PlatformId>(account?.platform ?? fixed ?? "meta");
  const [name, setName] = useState(account?.name ?? "");
  const [values, setValues] = useState<Record<string, string>>(account?.values ?? {});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const def = PLATFORMS[platform];
  const locked = !canUse(ws.tier, def.tier);

  function save() {
    const next: Record<string, string> = {};
    const errs: Record<string, string | null> = {};
    for (const f of def.fields) {
      const raw = (values[f.key] ?? "").trim();
      if (!raw) {
        if (!f.optional) errs[f.key] = "Preencha este campo.";
        continue;
      }
      const check = validateId(f.kind, raw);
      if (check.ok) next[f.key] = check.value;
      else errs[f.key] = check.error;
    }
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    const saved: Account = {
      id: account?.id ?? newId("ac_"),
      platform,
      name: name.trim() || `${def.short} · ${next.account ?? ""}`,
      values: next,
      status: "aguardando",
      createdAt: account?.createdAt ?? new Date().toISOString(),
    };
    store.put("accounts", saved);
    onSaved(saved);
  }

  return (
    <div className="space-y-4">
      {!fixed && !account && (
        <SelectField
          label="Plataforma"
          value={platform}
          onChange={(v) => {
            setPlatform(v as PlatformId);
            setValues({});
            setErrors({});
          }}
          options={PLATFORM_ORDER.map((id) => ({
            value: id,
            label: `${PLATFORMS[id].name}${canUse(ws.tier, PLATFORMS[id].tier) ? "" : ` · ${availableIn(PLATFORMS[id].tier)}`}`,
          }))}
        />
      )}
      {locked ? (
        <div className="rounded-card border border-line bg-card p-4 text-[14px]">
          <LockBadge label={availableIn(def.tier)} />
          <p className="mt-2 text-fg-2">{def.name} entra a partir do Pro. Troque o plano simulado no topo para testar.</p>
        </div>
      ) : (
        <>
          <TextField label="Nome (para você reconhecer)" value={name} onChange={setName} placeholder={`Ex.: ${def.short} · Loja Verde`} />
          {def.fields.map((f) => (
            <TextField
              key={f.key}
              label={`${f.label}${f.optional ? " (opcional)" : ""}`}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              hint={f.hint}
              error={errors[f.key]}
              inputMode={f.kind === "text" || f.kind === "ga4Measurement" ? "text" : "numeric"}
              onChange={(v) => {
                setValues((s) => ({ ...s, [f.key]: maskId(f.kind, v) }));
                setErrors((e) => ({ ...e, [f.key]: null }));
              }}
            />
          ))}
          <PendingChip label="Conexão automática (OAuth) em breve" detail="Por enquanto, a conta fica como “Aguardando conexão” e o dashboard usa dados de amostra." />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={save} className={btn.small}>
              {account ? "Salvar conta" : "Adicionar conta"}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} className={`${btn.ghost} h-9`}>
                Cancelar
              </button>
            )}
          </div>
          {!account && <p className="text-[12px] text-fg-2">Cada conta conta no limite do plano ({ws.contractedAccounts} contratadas).</p>}
        </>
      )}
    </div>
  );
}

/** Texto curto do ID principal (para listas). */
export function accountIdLabel(a: Account): string {
  return a.values.account ?? Object.values(a.values)[0] ?? "—";
}
