import type { Metadata } from "next";
import { Suspense } from "react";
import { queryValue } from "@/features/auth/form";
import { LoginPage } from "@/features/auth/LoginPage";
import { noticeFor } from "@/features/auth/messages";
import { googleSignInStatus } from "@/server/auth/google";
import { safeNextPath } from "@/server/http/request";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no VYZ com e-mail e senha ou com o Google.",
};

// ?next= e ?erro= são da requisição e o estado do Google vem da rede (com
// cache curto): o formulário completo chega dentro do Suspense. Até lá, a
// casca estática mostra o mesmo formulário com os padrões.
export default function Entrar({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense fallback={<LoginPage next="/painel" google="unknown" />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const [query, google] = await Promise.all([searchParams, googleSignInStatus()]);
  return <LoginPage next={safeNextPath(queryValue(query.next))} google={google} notice={noticeFor(queryValue(query.erro) ?? queryValue(query.aviso))} />;
}
