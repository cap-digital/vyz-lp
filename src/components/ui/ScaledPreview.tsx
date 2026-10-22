"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renderiza o conteúdo numa largura fixa e escala (só transform) para caber
 * no contêiner. Usado nas miniaturas reais da galeria.
 */
export function ScaledPreview({ width = 760, height, children, className = "" }: { width?: number; height: number; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ height }} aria-hidden>
      <div className="pointer-events-none absolute top-0 left-0 origin-top-left select-none" style={{ width, transform: `scale(${scale})` }} inert>
        {children}
      </div>
    </div>
  );
}
