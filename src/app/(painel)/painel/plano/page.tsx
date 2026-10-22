import type { Metadata } from "next";
import { PlanPage } from "@/features/workspace/PlanPage";

export const metadata: Metadata = { title: "Plano" };

export default function Page() {
  return <PlanPage />;
}
