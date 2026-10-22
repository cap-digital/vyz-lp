"use client";

import { useEffect, useRef, useState } from "react";

export type Size = { width: number; height: number };

/**
 * Mede o elemento com ResizeObserver e debounce de 1 quadro: várias mudanças
 * no mesmo quadro (sidebar recolhendo, por exemplo) viram uma medida só.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const width = Math.floor(el.clientWidth);
      const height = Math.floor(el.clientHeight);
      setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
    };
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return [ref, size] as const;
}
