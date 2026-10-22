/** Balão de conversa simples (sem marca de terceiros). */
export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8.1 19L4 20z" />
      <path d="M9.5 9.5c.3 1.6 1.4 3.1 3.1 3.9l1.2-.8 1.6.9" />
    </svg>
  );
}
