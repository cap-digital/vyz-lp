"use client";

// Permitir e Cancelar da tela simulada: links para a rota de volta, como o
// provedor de verdade faz. Depois do primeiro clique os dois travam (o state
// vale uma vez; um clique duplo voltaria com "pedido inválido").

import { LoaderCircle } from "lucide-react";
import { btn } from "@/components/ui/styles";
import { useLeaving } from "./leaving";

const locked = "aria-disabled:pointer-events-none aria-disabled:opacity-40";

export function ConsentActions({ allow, deny }: { allow: string; deny: string }) {
  const { leaving, leave } = useLeaving<"allow" | "deny">();
  const spinner = <LoaderCircle size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />;

  return (
    <div className="mt-3 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
      <a href={allow} onClick={leave("allow")} aria-busy={leaving === "allow"} aria-disabled={leaving === "deny"} className={`${btn.primary} rounded-[10px] ${locked}`}>
        {leaving === "allow" && spinner}
        {leaving === "allow" ? "Conectando…" : "Permitir"}
      </a>
      <a href={deny} onClick={leave("deny")} aria-busy={leaving === "deny"} aria-disabled={leaving === "allow"} className={`${btn.secondary} rounded-[10px] ${locked}`}>
        {leaving === "deny" && spinner}
        {leaving === "deny" ? "Cancelando…" : "Cancelar"}
      </a>
    </div>
  );
}
