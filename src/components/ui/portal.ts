"use client";

import { createContext, useContext } from "react";

/**
 * Onde os popovers (Select, menu, calendário, tooltip) montam. Fora de modal,
 * no <body>; dentro do <dialog> nativo, no próprio dialog, que vive na camada
 * de cima e cobriria qualquer coisa montada no <body>.
 */
export const PortalContainer = createContext<HTMLElement | null>(null);
export const usePortalContainer = () => useContext(PortalContainer) ?? undefined;
