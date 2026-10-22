"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

/** Aviso curto no rodapé da tela (aria-live). */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const show = useCallback((text: string) => setMsg({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [msg]);

  const node = (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 lg:bottom-8">
      <AnimatePresence>
        {msg && (
          <motion.p
            key={msg.id}
            initial={{ opacity: 0, y: 16, clipPath: "inset(50% 0 50% 0 round 999px)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0% 0 round 999px)" }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-chip bg-fg px-4 py-2 text-sm font-medium text-bg"
          >
            <Check size={16} aria-hidden />
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
  return { show, node };
}
