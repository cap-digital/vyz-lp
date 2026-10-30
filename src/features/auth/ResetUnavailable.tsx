// /redefinir-senha sem a sessão do link. Sem sessão (link expirado, outro
// navegador): pedir outro link. Com sessão comum (entrou com senha ou
// Google): trocar a senha ali mesmo, informando a atual.

import Link from "next/link";
import { btn } from "@/components/ui/styles";
import { ChangePasswordForm } from "./AccountSecurity";
import { AuthCard, authLink } from "./AuthShell";

export function ResetUnavailable({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <AuthCard
        title="Trocar a senha"
        description="Este link de redefinição não vale mais, mas a sua conta está aberta: para trocar a senha, informe a atual."
        footer={
          <p>
            <Link href="/painel" className={authLink}>
              Ir para o painel
            </Link>
          </p>
        }
      >
        <ChangePasswordForm compact={false} className="mt-5" />
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Link expirado"
      description="Abra o link mais recente que enviamos por e-mail, no mesmo navegador em que você pediu a senha nova. Se ele expirou, peça outro."
    >
      <div className="mt-5 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
        <Link href="/recuperar-senha" className={`${btn.primary} rounded-[10px]`}>
          Pedir novo link
        </Link>
        <Link href="/entrar" className={`${btn.secondary} rounded-[10px]`}>
          Voltar para entrar
        </Link>
      </div>
    </AuthCard>
  );
}
