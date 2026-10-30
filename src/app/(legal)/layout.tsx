import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Páginas legais: texto corrido, sem motion. Os links ficam no rodapé, no checkout e no app.
export const metadata: Metadata = { title: { default: "VYZ", template: "%s · VYZ" } };

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="VYZ, voltar ao site" className="block w-[72px]">
          <Wordmark decorative />
        </Link>
        <ThemeToggle className="size-10" />
      </header>
      <main className="flex-1 px-4 pt-6 pb-20 sm:px-6">
        <article className="legal mx-auto max-w-[720px] text-[15px] leading-relaxed text-fg-2 [&_a]:text-accent [&_a]:underline [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-fg [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:text-fg [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
      <footer className="border-t border-line px-4 py-5 text-center text-[13px] text-fg-2">
        <Link href="/termos" className="hover:text-accent">Termos de Uso</Link>
        {" · "}
        <Link href="/privacidade" className="hover:text-accent">Política de Privacidade</Link>
      </footer>
    </div>
  );
}
