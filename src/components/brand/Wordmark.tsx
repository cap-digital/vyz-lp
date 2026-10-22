import { LETTER_STEP, V_POLYS, WORDMARK_WIDTH, Y_POLYS, Z_POLYS } from "./geometry";

type WordmarkProps = {
  /** "full" = assinatura principal com "visualize"; "reduced" = só o wordmark. */
  variant?: "full" | "reduced";
  /** Cor do wordmark (classe de texto). Padrão: destaque do modo atual. */
  className?: string;
  /** Cor do descritivo "visualize". Padrão: texto primário. */
  descriptorClassName?: string;
  title?: string;
};

// "visualize": Inter 500, tracking +34%, centralizado abaixo da base.
const DESC_SIZE = 2.2;
const DESC_TRACKING = 0.34;
const DESC_BASELINE = 14.3;
const FULL_HEIGHT = 14.8;

export function Wordmark({
  variant = "reduced",
  className = "text-accent",
  descriptorClassName = "text-fg",
  title = "VYZ",
}: WordmarkProps) {
  const full = variant === "full";
  const height = full ? FULL_HEIGHT : 10;

  return (
    <svg
      viewBox={`0 0 ${WORDMARK_WIDTH} ${height}`}
      role="img"
      aria-label={full ? `${title} · visualize` : title}
      className={className}
      style={{ display: "block", height: "auto", overflow: "visible" }}
    >
      <g fill="currentColor">
        {V_POLYS.map((p) => (
          <polygon key={p} points={p} />
        ))}
        <g transform={`translate(${LETTER_STEP} 0)`}>
          {Y_POLYS.map((p) => (
            <polygon key={p} points={p} />
          ))}
        </g>
        <g transform={`translate(${LETTER_STEP * 2} 0)`}>
          {Z_POLYS.map((p) => (
            <polygon key={p} points={p} />
          ))}
        </g>
      </g>
      {full && (
        <text
          className={descriptorClassName}
          // o tracking também entra depois da última letra; compensa no centro
          x={WORDMARK_WIDTH / 2 + (DESC_SIZE * DESC_TRACKING) / 2}
          y={DESC_BASELINE}
          textAnchor="middle"
          fill="currentColor"
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 500,
            fontSize: DESC_SIZE,
            letterSpacing: `${DESC_TRACKING}em`,
          }}
        >
          visualize
        </text>
      )}
    </svg>
  );
}
