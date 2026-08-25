import { formatMoney } from "@/lib/format";

export interface CategoryComparisonRow {
  categoryName: string;
  thisMonth: number;
  lastMonth: number;
}

export function CategoryComparison({ rows }: { rows: CategoryComparisonRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">Nenhum gasto neste mês ou no anterior.</p>;
  }

  const max = Math.max(...rows.flatMap((row) => [row.thisMonth, row.lastMonth]), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Este mês
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-primary/35 h-2 w-2 rounded-full" /> Mês anterior
        </span>
      </div>

      {rows.map((row) => {
        const thisPct = (row.thisMonth / max) * 100;
        const lastPct = (row.lastMonth / max) * 100;
        const left = Math.min(thisPct, lastPct);
        const width = Math.abs(thisPct - lastPct);

        return (
          <div key={row.categoryName}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-ink">{row.categoryName}</span>
              <span className="font-amount shrink-0 text-ink">
                {formatMoney(row.thisMonth)}{" "}
                <span className="text-ink-soft">vs {formatMoney(row.lastMonth)}</span>
              </span>
            </div>
            <div className="relative mt-2 h-2">
              <div className="absolute inset-0 rounded-full bg-border" />
              <div
                className="bg-ink/15 absolute top-1/2 h-0.5 -translate-y-1/2"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
              <div
                className="bg-primary/35 ring-paper absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                style={{ left: `${lastPct}%` }}
              />
              <div
                className="ring-paper absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2"
                style={{ left: `${thisPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
