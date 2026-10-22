"use client";

import Lenis from "lenis";
import { useEffect } from "react";

let lenis: Lenis | null = null;

const NAV_OFFSET = -80;

/** Rola até uma âncora, com Lenis quando ativo. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: NAV_OFFSET, duration: 1.2 });
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function stopScroll(stop: boolean) {
  if (stop) lenis?.stop();
  else lenis?.start();
}

/** Scroll suave com Lenis; desligado com prefers-reduced-motion. */
export function SmoothScroll() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = () => {
      if (mq.matches || lenis) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: NAV_OFFSET } });
    };
    const stop = () => {
      lenis?.destroy();
      lenis = null;
    };
    const onChange = () => (mq.matches ? stop() : start());
    start();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      stop();
    };
  }, []);
  return null;
}
