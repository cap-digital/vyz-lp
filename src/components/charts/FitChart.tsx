"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Size = { width: number; height: number };

/**
 * Mede o espaço disponível e entrega largura e altura reais para o gráfico
 * desenhar em tamanho de leitura (sem scale). O observer se desliga ao desmontar.
 */
export function FitChart({ children, className = "", minHeight = 140 }: { children: (size: Size) => ReactNode; className?: string; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setSize((s) => (s && s.width === w && s.height === h ? s : { width: w, height: h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative min-h-0 w-full overflow-hidden ${className}`} style={{ minHeight }}>
      {size && size.width > 0 && size.height > 0 && <div className="absolute inset-0">{children(size)}</div>}
    </div>
  );
}
