import { Icon } from "@/components/brand/Icon";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Vitrine provisória da etapa 1 (tokens, fonte e logo). Será substituída pelas dobras.
const combos = [
  { bg: "bg-offwhite", mark: "text-army", desc: "text-offblack", label: "Off-white + verde-exército" },
  { bg: "bg-offblack", mark: "text-sage", desc: "text-offwhite", label: "Off-black + sálvia" },
  { bg: "bg-army", mark: "text-offwhite", desc: "text-offwhite", label: "Verde-exército + off-white" },
  { bg: "bg-sage", mark: "text-deep", desc: "text-deep", label: "Sálvia + verde profundo" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="w-24">
          <Wordmark />
        </div>
        <ThemeToggle />
      </header>

      <section className="flex flex-col items-center gap-6 rounded-card bg-offblack px-6 py-24">
        <div className="w-full max-w-xl">
          <Wordmark variant="full" className="text-sage" descriptorClassName="text-offwhite" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "Principal", el: <Wordmark variant="full" /> },
          { t: "Reduzida (só o wordmark)", el: <Wordmark /> },
          { t: "Monocromática", el: <Wordmark variant="full" className="text-fg" /> },
        ].map(({ t, el }) => (
          <div key={t} className="rounded-card border border-line bg-card p-5">
            <p className="label-caps text-fg-2">{t}</p>
            <div className="mx-auto w-3/5 py-16">{el}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        {combos.map((c) => (
          <figure key={c.label}>
            <div className={`${c.bg} flex aspect-[4/5] items-center justify-center rounded-card border border-line`}>
              <div className="w-3/5">
                <Wordmark variant="full" className={c.mark} descriptorClassName={c.desc} />
              </div>
            </div>
            <figcaption className="mt-2 text-sm text-fg-2">{c.label}</figcaption>
          </figure>
        ))}
      </section>

      <section className="flex flex-wrap items-end gap-6">
        <div className="w-52"><Icon className="text-offwhite" background="#4B5320" /></div>
        <div className="w-36"><Icon className="text-sage" background="#1E1E1E" /></div>
        <div className="w-24 rounded-[22%] border border-line"><Icon className="text-army" background="#E8ECE1" /></div>
        <div className="w-12"><Icon className="text-offwhite" background="#4B5320" radius={50} /></div>
        <div className="w-8"><Icon className="text-offwhite" background="#4B5320" /></div>
        <div className="w-4"><Icon className="text-offwhite" background="#4B5320" /></div>
      </section>

      <section className="space-y-3">
        <h1 className="display text-6xl">Pare de montar relatório na mão.</h1>
        <h2 className="title text-3xl">Custo por venda</h2>
        <p className="label-caps text-fg-2">Rótulo · caixa alta</p>
        <p className="tnum text-4xl font-bold">R$ 61,20 · 0123456789</p>
        <div className="flex gap-3">
          <span className="rounded-control bg-accent px-4 py-2 font-semibold text-on-accent">Criar dashboard</span>
          <span className="rounded-control border border-accent px-4 py-2 font-semibold text-accent">Exportar PDF</span>
          <span className="rounded-chip bg-accent-soft px-3 py-1 text-sm">Meta Ads</span>
        </div>
      </section>
    </main>
  );
}
