import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/AuthShell";

// Área de acesso: sem Lenis, intro nem motion da LP, e fora dos buscadores.
// A moldura (malha do logo, wordmark e tema) é a mesma em todas as telas.
export const metadata: Metadata = {
  title: { default: "Entrar", template: "%s · VYZ" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
