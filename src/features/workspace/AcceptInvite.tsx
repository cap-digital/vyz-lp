"use client";

import { useState, useTransition } from "react";
import { btn } from "@/components/ui/styles";
import { acceptInvitation } from "@/server/workspace/team";

export function AcceptInvite({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const accept = () =>
    start(async () => {
      // sucesso redireciona para o painel
      const r = await acceptInvitation(token);
      if (!r.ok) setError(r.error.message);
    });
  return (
    <div className="mt-5 space-y-3">
      {error && (
        <p role="alert" className="text-[13px] text-error-fg">
          {error}
        </p>
      )}
      <button type="button" className={btn.small} disabled={pending} onClick={accept}>
        {pending ? "Entrando…" : "Aceitar convite"}
      </button>
    </div>
  );
}
