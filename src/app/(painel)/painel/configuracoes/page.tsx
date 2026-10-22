import type { Metadata } from "next";
import { SettingsPage } from "@/features/workspace/SettingsPage";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return <SettingsPage />;
}
