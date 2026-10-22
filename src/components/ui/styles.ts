// Classes de botão compartilhadas. Raio de 8 px nos controles, sem sombra.

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-[background-color,color,border-color,opacity,transform] duration-200 ease-brand active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

export const btn = {
  primary: `${base} h-12 px-6 bg-accent text-on-accent hover:opacity-90`,
  secondary: `${base} h-12 px-6 border border-line text-fg hover:border-accent hover:text-accent`,
  outline: `${base} h-11 px-5 border border-accent text-accent hover:bg-accent-soft`,
  ghost: `${base} h-10 px-3 text-accent hover:bg-accent-soft`,
  small: `${base} h-9 px-4 text-sm bg-accent text-on-accent hover:opacity-90`,
};

export const chip =
  "inline-flex items-center gap-1.5 rounded-chip border border-line px-3 py-1 text-[13px] text-fg-2";

export const card = "rounded-card border border-line bg-card";
