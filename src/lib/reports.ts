import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { monthStart, shiftMonths } from "@/lib/billing-cycle";
import { computeCategorySpending } from "@/lib/budgets";
import { computeTotalNetWorth } from "@/lib/accounts";

export interface MonthlySummary {
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
}

/**
 * Income vs. expense for a month. Expense counts card purchases (see
 * Fase 3/4): a purchase is real spending the moment it happens, not only
 * when the invoice is paid. Transfers and invoice payments never count —
 * they move money around, they aren't income or expense.
 */
export async function getMonthlySummary(userId: string, referenceMonth: Date): Promise<MonthlySummary> {
  const start = monthStart(referenceMonth);
  const end = shiftMonths(start, 1);

  const [incomeAgg, spending] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    computeCategorySpending(userId, start),
  ]);

  let expense = new Prisma.Decimal(0);
  for (const amount of spending.values()) {
    expense = expense.plus(amount);
  }

  return {
    income: incomeAgg._sum.amount ?? new Prisma.Decimal(0),
    expense,
  };
}

export interface CategoryComparison {
  categoryName: string;
  thisMonth: Prisma.Decimal;
  lastMonth: Prisma.Decimal;
}

/**
 * Spending per expense category this month vs. last month — only
 * categories with activity in at least one of the two months, so the chart
 * never pads itself with rows that are all zero.
 */
export async function getCategoryComparison(
  userId: string,
  referenceMonth: Date,
): Promise<CategoryComparison[]> {
  const start = monthStart(referenceMonth);
  const previousStart = shiftMonths(start, -1);

  const [categories, thisMonthSpending, lastMonthSpending] = await Promise.all([
    prisma.category.findMany({ where: { userId, kind: "EXPENSE" } }),
    computeCategorySpending(userId, start),
    computeCategorySpending(userId, previousStart),
  ]);

  return categories
    .map((category) => ({
      categoryName: category.name,
      thisMonth: thisMonthSpending.get(category.id) ?? new Prisma.Decimal(0),
      lastMonth: lastMonthSpending.get(category.id) ?? new Prisma.Decimal(0),
    }))
    .filter((row) => row.thisMonth.gt(0) || row.lastMonth.gt(0))
    .sort((a, b) => b.thisMonth.comparedTo(a.thisMonth));
}

export interface NetWorthPoint {
  month: Date;
  netWorth: Prisma.Decimal;
}

/**
 * Net worth (sum of every account's balance) at the end of each of the
 * last `months` months, using today's balance for the current month since
 * it isn't over yet. A rolling window, not "since the beginning of time".
 */
export async function getNetWorthHistory(userId: string, months = 12): Promise<NetWorthPoint[]> {
  const today = new Date();
  const currentMonthStart = monthStart(today);

  const points: NetWorthPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const pointMonth = shiftMonths(currentMonthStart, -i);
    const isCurrentMonth = i === 0;
    // Last instant of pointMonth (UTC midnight of its final day), so a
    // transaction dated the 1st of the *next* month is correctly excluded.
    const lastDayOfMonth = new Date(shiftMonths(pointMonth, 1).getTime() - 86_400_000);
    const asOf = isCurrentMonth ? today : lastDayOfMonth;
    const netWorth = await computeTotalNetWorth(userId, asOf);
    points.push({ month: pointMonth, netWorth });
  }

  return points;
}
