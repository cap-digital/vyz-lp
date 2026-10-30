import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MSG_SPECIALIST, waLink } from "@/lib/whatsapp";

// Checkout: layout próprio, sem Lenis, intro nem motion da LP, e fora dos buscadores.
export const metadata: Metadata = {
  title: { default: "Assinar", template: "%s · VYZ" },
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-bg">
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="VYZ, voltar ao site" className="block w-[72px]">
          <Wordmark decorative />
        </Link>
        <ThemeToggle className="size-10" />
      </header>
      <main className="relative flex-1 px-4 pt-4 pb-16 sm:px-6 lg:px-10">{children}</main>
      <footer className="border-t border-line px-4 py-5 text-center text-[13px] text-fg-2 sm:px-6">
        Dúvida sobre o plano?{" "}
        <a href={waLink(MSG_SPECIALIST)} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline-offset-4 hover:underline">
          Fale com um especialista no WhatsApp
        </a>
      </footer>
    </div>
  );
}
