import type { Metadata } from "next";
import { LandingList } from "@/features/landing-pages/LandingList";

export const metadata: Metadata = { title: "Landing pages" };

export default function Page() {
  return <LandingList />;
}
