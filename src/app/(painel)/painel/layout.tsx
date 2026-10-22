import type { Metadata } from "next";
import { AppShell } from "@/features/workspace/AppShell";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel VYZ" },
  description: "Dashboards e landing pages para gestores de tráfego.",
};

/** Área do painel: app shell próprio, sem Lenis, intro nem motion pesado. */
export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return <AppShell>{children}</AppShell>;
}
