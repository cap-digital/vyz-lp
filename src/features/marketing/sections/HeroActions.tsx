"use client";

import { ArrowRight } from "lucide-react";
import { Magnetic } from "@/components/motion/Magnetic";
import { GENERATOR_INPUT_ID } from "@/features/marketing/mock/MockGenerator";
import { btn } from "@/components/ui/styles";

export function HeroActions() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Magnetic>
        <a href="#planos" className={`${btn.primary} group`}>
          Ver planos
          <ArrowRight size={18} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      </Magnetic>
      <button
        type="button"
        className={btn.secondary}
        onClick={() => {
          const input = document.getElementById(GENERATOR_INPUT_ID);
          if (!input) return;
          input.scrollIntoView({ block: "center", behavior: "smooth" });
          input.focus({ preventScroll: true });
        }}
      >
        Gerar um exemplo
      </button>
    </div>
  );
}
