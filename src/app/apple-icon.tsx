import { ImageResponse } from "next/og";
import { V_POLYS } from "@/components/brand/geometry";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone do app: V cortado em off-white sobre verde-exército, 56% do contêiner. */
export default function AppleIcon() {
  const scale = (180 * 0.56) / 10;
  const offset = (180 - 10 * scale) / 2;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#4B5320" }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <g transform={`translate(${offset} ${offset}) scale(${scale})`}>
            {V_POLYS.map((p) => (
              <polygon key={p} points={p} fill="#E8ECE1" />
            ))}
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
