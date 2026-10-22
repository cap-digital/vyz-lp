"use client";

import { useLayoutEffect } from "react";

/**
 * Reaplica os atributos que o script do <head> põe no <html>. Em dev, o
 * remount do Strict Mode limpa o que não veio do JSX; em produção é no-op.
 */
export function HtmlFlags() {
  useLayoutEffect(() => {
    const d = document.documentElement;
    d.setAttribute("data-js", "");
    try {
      const t = localStorage.getItem("vyz-theme");
      if (t === "light" || t === "dark") d.setAttribute("data-theme", t);
    } catch {}
  }, []);
  return null;
}
