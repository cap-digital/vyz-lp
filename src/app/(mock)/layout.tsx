import type { Metadata } from "next";

// Telas que fazem o papel de serviços externos no modo de teste (login do
// Meta e do Google). Fora do modo simulado respondem 404. Nunca nos buscadores.
export const metadata: Metadata = {
  title: { default: "Modo de teste", template: "%s · VYZ" },
  robots: { index: false, follow: false },
};

export default function MockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
