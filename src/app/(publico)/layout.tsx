import type { Metadata } from "next";

// Páginas públicas (link do dashboard e prévia de LP): sem painel e fora dos buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
