import type { Metadata } from "next";
import { AccountsPage } from "@/features/accounts/AccountsPage";

export const metadata: Metadata = { title: "Contas" };

export default function Page() {
  return <AccountsPage />;
}
