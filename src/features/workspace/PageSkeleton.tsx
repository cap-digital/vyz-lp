// Esqueleto das páginas do painel enquanto a sessão e o banco respondem.

export function PageSkeleton({ label, blocks = [40, 44, 44] }: { label: string; blocks?: number[] }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={label}>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-control bg-card motion-reduce:animate-none" />
        <div className="h-10 w-72 max-w-full animate-pulse rounded-control bg-card motion-reduce:animate-none" />
      </div>
      {blocks.map((h, i) => (
        <div key={i} className="animate-pulse rounded-card bg-card motion-reduce:animate-none" style={{ height: h * 4 }} />
      ))}
    </div>
  );
}
