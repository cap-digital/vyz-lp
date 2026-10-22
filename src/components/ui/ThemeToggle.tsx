"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useState } from "react";

const KEY = "vyz-theme";
type Theme = "light" | "dark";

function readStored(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Reaplica o tema salvo (o remount do Strict Mode em dev limpa o atributo)
  // e descobre o modo efetivo para o rótulo do botão.
  useLayoutEffect(() => {
    const stored = readStored();
    if (stored) document.documentElement.setAttribute("data-theme", stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o DOM antes da pintura
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme ? isDark : undefined}
      aria-label="Modo escuro"
      title={isDark ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      className={`inline-flex size-10 items-center justify-center rounded-control border border-line text-fg transition-colors duration-150 hover:bg-accent-soft ${className}`}
    >
      {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
