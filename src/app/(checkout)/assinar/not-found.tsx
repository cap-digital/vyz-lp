import Link from "next/link";
import { btn } from "@/components/ui/styles";

// Pedido que não existe ou é de outra conta (o RLS esconde os dois do mesmo jeito).
export default function NotFound() {
  return (
    <section aria-labelledby="nao-encontrado-titulo" className="mx-auto mt-10 max-w-2xl rounded-card border border-line bg-card p-6 sm:p-8">
      <p className="label-caps text-fg-2">Pedido</p>
      <h1 id="nao-encontrado-titulo" className="display mt-3 text-[clamp(1.9rem,4vw,2.8rem)] text-fg">
        Não encontramos este pedido.
      </h1>
      <p className="mt-4 text-[15px] text-fg-2">Ele pode ser de outra conta. Entre com o e-mail que fez o pedido ou monte um novo.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/assinar" className={btn.primary}>
          Montar um pedido
        </Link>
        <Link href="/entrar" className={btn.secondary}>
          Entrar
        </Link>
      </div>
    </section>
  );
}
