import { V_POLYS } from "./geometry";

type IconProps = {
  /** Cor do V (classe de texto). */
  className?: string;
  /** Cor do contêiner. Sem valor, o ícone sai sem fundo. */
  background?: string;
  /** Raio do contêiner, em % do lado (22 ≈ app, 50 = círculo). */
  radius?: number;
  title?: string;
};

// O V cortado ocupa 56% da largura do contêiner, centralizado (pág. 11).
const SCALE = 5.6;
const OFFSET = (100 - 10 * SCALE) / 2;

export function Icon({ className = "text-accent", background, radius = 22, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block" }}
    >
      {background && <rect width="100" height="100" rx={radius} fill={background} />}
      <g fill="currentColor" transform={`translate(${OFFSET} ${OFFSET}) scale(${SCALE})`}>
        {V_POLYS.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
    </svg>
  );
}
