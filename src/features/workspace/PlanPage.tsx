"use client";

import { PageHeader } from "@/components/ui/kit";
import { Stepper } from "@/components/ui/Stepper";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { UsageBar } from "@/features/accounts/AccountsPage";
import { LIMIT_ROWS, TIER_LABEL, TIERS, canUse } from "@/features/pricing/entitlements";
import { MAX_ACCOUNTS_IN_PLAN } from "@/features/pricing/pricing";
import { useCollection } from "@/lib/store/hooks";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { PlanSimulator } from "./AppShell";
import type { Account, Dashboard, LandingPage } from "./types";
import { useWorkspace } from "./workspace";

export function PlanPage() {
  const { ws, ent, update } = useWorkspace();
  const accounts = useCollection<Account>("accounts");
  const dashboards = useCollection<Dashboard>("dashboards");
  const pages = useCollection<LandingPage>("landingPages");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Plano" title={`Plano ${TIER_LABEL[ws.tier]}`} text="Plano simulado: escolha um nível para testar os limites e os bloqueios do painel." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-card border border-line bg-card p-5" aria-labelledby="h-sim">
          <h2 id="h-sim" className="title text-lg">
            Simulação
          </h2>
          <PlanSimulator />
          <Stepper
            label="Contas contratadas"
            hint={`Até ${MAX_ACCOUNTS_IN_PLAN}; acima disso, o plano é sob consulta.`}
            unit="conta contratada"
            value={ws.contractedAccounts}
            min={1}
            max={MAX_ACCOUNTS_IN_PLAN}
            onChange={(contractedAccounts) => update({ contractedAccounts })}
          />
        </section>
        <section className="space-y-4 rounded-card border border-line bg-card p-5" aria-labelledby="h-uso">
          <h2 id="h-uso" className="title text-lg">
            Uso atual
          </h2>
          <UsageBar used={accounts.length} limit={ws.contractedAccounts} label="Contas" />
          <UsageBar used={dashboards.length} limit={ent.maxDashboards} label="Dashboards" />
          <UsageBar used={pages.filter((p) => p.published).length} limit={ent.maxLandingPages} label="Landing pages publicadas" />
        </section>
      </div>

      <section aria-labelledby="h-limites" className="space-y-3">
        <h2 id="h-limites" className="title text-lg">
          Limites por plano
        </h2>
        <div className="overflow-x-auto rounded-card border border-line bg-card">
          <table className="w-full min-w-[680px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 font-medium text-fg-2">
                  &nbsp;
                </th>
                {TIERS.map((t) => (
                  <th key={t} scope="col" className={`px-4 py-3 font-semibold ${t === ws.tier ? "bg-accent-soft" : ""}`}>
                    {TIER_LABEL[t]}
                    {t === ws.tier && <span className="ml-1.5 text-[11px] font-medium text-fg-2">atual</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {LIMIT_ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="px-4 py-2.5 font-medium text-fg-2">
                    {r.label}
                  </th>
                  {TIERS.map((t) => (
                    <td key={t} className={`px-4 py-2.5 ${t === ws.tier ? "bg-accent-soft/60 font-semibold" : ""}`}>
                      {r.value(t)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3" />
                {TIERS.map((t) => (
                  <td key={t} className="px-4 py-3">
                    {!canUse(ws.tier, t) && (
                      <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], TIER_LABEL[t]))} target="_blank" rel="noopener noreferrer" className={`${btn.small} h-8 px-3 text-[12.5px]`}>
                        <WhatsAppIcon size={14} /> Upgrade
                      </a>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-fg-2">Os limites de dashboards e de landing pages publicadas são provisórios.</p>
      </section>
    </div>
  );
}
