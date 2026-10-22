const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

type OdometerProps = {
  value: string;
  className?: string;
  /** Atraso entre dígitos, da direita para a esquerda (ms). */
  stagger?: number;
};

/**
 * Número que troca dígito por dígito, como odômetro. Cada coluna é uma fita
 * de 0 a 9 que só se move em transform; a largura vem de tabular-nums.
 * O texto real fica em sr-only.
 */
export function Odometer({ value, className = "", stagger = 28 }: OdometerProps) {
  const chars = value.split("");
  return (
    <span className={`odo ${className}`}>
      <span className="sr-only">{value}</span>
      <span className="odo-track" aria-hidden>
        {chars.map((c, i) => {
          // chave a partir da direita: as unidades ficam na mesma coluna
          const fromRight = chars.length - i;
          if (!/\d/.test(c)) {
            return (
              <span key={`c${fromRight}`} className="odo-char">
                {c === " " ? " " : c}
              </span>
            );
          }
          return (
            <span key={`d${fromRight}`} className="odo-digit">
              <span
                className="odo-strip"
                style={{
                  transform: `translateY(${-Number(c) * 10}%)`,
                  transitionDelay: `${fromRight * stagger}ms`,
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Mesmo formato, com todos os dígitos zerados (para a contagem inicial). */
export function zeroed(value: string): string {
  return value.replace(/\d/g, "0");
}
