import { Suspense } from "react";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ComoFunciona } from "@/components/sections/ComoFunciona";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { MonteSeuPlano } from "@/components/sections/MonteSeuPlano";
import { Navbar } from "@/components/sections/Navbar";
import { Planos } from "@/components/sections/Planos";
import { Ticker } from "@/components/sections/Ticker";
import { PlanProvider } from "@/components/state/PlanProvider";
import { UrlSync } from "@/components/state/UrlSync";

export default function Home() {
  return (
    <MotionRoot>
      <PlanProvider>
        {/* useSearchParams precisa de Suspense com Cache Components; o resto segue pré-renderizado */}
        <Suspense fallback={null}>
          <UrlSync />
        </Suspense>
        <SmoothScroll />
        <a
          href="#conteudo"
          className="sr-only z-[90] rounded-control bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <Intro />
        <ScrollProgress />
        <Navbar />
        <main id="conteudo">
          <Hero />
          <Ticker />
          <ComoFunciona />
          <Planos />
          <MonteSeuPlano />
        </main>
        <Footer />
      </PlanProvider>
    </MotionRoot>
  );
}
