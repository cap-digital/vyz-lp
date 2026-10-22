import type { Metadata } from "next";
import { SharePage } from "@/features/share/SharePage";

export const metadata: Metadata = { title: "Compartilhar" };

export default function Page() {
  return <SharePage />;
}
