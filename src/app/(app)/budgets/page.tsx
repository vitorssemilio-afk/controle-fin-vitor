import Link from "next/link";
import { requireCurrentUserId } from "@/lib/current-user";
import { syncRecurringTransactionsForUser } from "@/lib/recurring-transactions";
import { listBudgetOverviewForUser } from "@/lib/budgets";
import { shiftMonths } from "@/lib/billing-cycle";
import { BudgetRow } from "@/components/budget-row";

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

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireCurrentUserId();
  await syncRecurringTransactionsForUser(userId);

  const { month } = await searchParams;
  const referenceMonth = parseMonth(month);
  const previousMonth = shiftMonths(referenceMonth, -1);
  const nextMonth = shiftMonths(referenceMonth, 1);

  const overview = await listBudgetOverviewForUser(userId, referenceMonth);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Orçamentos</h1>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/budgets?month=${monthParam(previousMonth)}`} className="text-sm text-ink-soft">
          ← anterior
        </Link>
        <p className="text-sm font-medium text-ink">{monthLabel(referenceMonth)}</p>
        <Link href={`/budgets?month=${monthParam(nextMonth)}`} className="text-sm text-ink-soft">
          próximo →
        </Link>
      </div>

      {overview.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-soft">
          Crie categorias de despesa para poder definir orçamentos.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {overview.map((item) => (
            <BudgetRow
              key={item.categoryId}
              data={{
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                limitAmount: item.limitAmount?.toString() ?? null,
                spent: item.spent.toString(),
                isOverBudget: item.isOverBudget,
                referenceMonth: referenceMonth.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
