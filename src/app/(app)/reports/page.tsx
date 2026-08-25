import Link from "next/link";
import { requireCurrentUserId } from "@/lib/current-user";
import { getCategoryComparison, getMonthlySummary, getNetWorthHistory } from "@/lib/reports";
import { formatMoney } from "@/lib/format";
import { CategoryComparison } from "@/components/category-comparison";
import { NetWorthChart } from "@/components/net-worth-chart";

function parseMonth(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function monthParam(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date);
  return label.replace(".", "");
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireCurrentUserId();
  const { month } = await searchParams;
  const referenceMonth = parseMonth(month);

  const [summary, categoryComparison, netWorthHistory] = await Promise.all([
    getMonthlySummary(userId, referenceMonth),
    getCategoryComparison(userId, referenceMonth),
    getNetWorthHistory(userId),
  ]);

  const balance = summary.income.minus(summary.expense);
  const previousMonth = new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() - 1, 1));
  const nextMonth = new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() + 1, 1));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-ink">Relatórios</h1>
        <a
          href={`/api/reports/export?month=${monthParam(referenceMonth)}`}
          className="text-sm font-medium text-primary"
        >
          Exportar CSV
        </a>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/reports?month=${monthParam(previousMonth)}`} className="text-sm text-ink-soft">
          ← anterior
        </Link>
        <p className="text-sm font-medium text-ink">{monthLabel(referenceMonth)}</p>
        <Link href={`/reports?month=${monthParam(nextMonth)}`} className="text-sm text-ink-soft">
          próximo →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border bg-surface px-3 py-3">
          <p className="text-xs text-ink-soft">Receitas</p>
          <p className="font-amount mt-1 text-sm text-positive">{formatMoney(summary.income.toString())}</p>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-3">
          <p className="text-xs text-ink-soft">Despesas</p>
          <p className="font-amount mt-1 text-sm text-negative">{formatMoney(summary.expense.toString())}</p>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-3">
          <p className="text-xs text-ink-soft">Saldo</p>
          <p className={`font-amount mt-1 text-sm ${balance.gte(0) ? "text-positive" : "text-negative"}`}>
            {formatMoney(balance.toString())}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-ink">Gastos por categoria</h2>
        <div className="mt-3">
          <CategoryComparison
            rows={categoryComparison.map((row) => ({
              categoryName: row.categoryName,
              thisMonth: row.thisMonth.toNumber(),
              lastMonth: row.lastMonth.toNumber(),
            }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-lg text-ink">Evolução do patrimônio</h2>
        <p className="text-sm text-ink-soft">Últimos 12 meses, somando todas as contas.</p>
        <div className="mt-3">
          <NetWorthChart
            points={netWorthHistory.map((point) => ({
              monthLabel: shortMonthLabel(point.month),
              value: point.netWorth.toNumber(),
            }))}
          />
        </div>
      </section>
    </main>
  );
}
