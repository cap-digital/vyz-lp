import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Onboarding: tela cheia sem a sidebar do painel, sem Lenis nem motion da LP,
// e fora dos buscadores. O passo a passo fica na página.
export const metadata: Metadata = {
  title: { default: "Começar", template: "%s · VYZ" },
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <span className="block w-[72px]">
          <Wordmark />
        </span>
        <ThemeToggle className="size-10" />
      </header>
      <main className="flex-1 px-4 pt-2 pb-16 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
