import type { Metadata } from "next";
import { DashboardsList } from "@/features/dashboards/DashboardsList";

export const metadata: Metadata = { title: "Dashboards" };

export default function Page() {
  return <DashboardsList />;
}
