import type { Metadata } from "next";
import { HomePage } from "@/features/workspace/HomePage";

export const metadata: Metadata = { title: "Início" };

export default function Page() {
  return <HomePage />;
}
