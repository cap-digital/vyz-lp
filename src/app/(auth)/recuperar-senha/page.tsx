import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { queryValue } from "@/features/auth/form";
import { noticeFor } from "@/features/auth/messages";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba por e-mail um link para criar uma senha nova.",
};

// ?erro= (link vencido, outro navegador) é dado da requisição: dentro do Suspense.
export default function RecuperarSenha({ searchParams }: PageProps<"/recuperar-senha">) {
  return (
    <Suspense fallback={<ForgotPasswordPage />}>
      {searchParams.then((query) => (
        <ForgotPasswordPage notice={noticeFor(queryValue(query.erro))} />
      ))}
    </Suspense>
  );
}
