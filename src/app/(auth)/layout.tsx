import type { Metadata } from "next";

// Área de acesso: sem Lenis, intro nem motion da LP, e fora dos buscadores.
export const metadata: Metadata = {
  title: { default: "Entrar", template: "%s · VYZ" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
