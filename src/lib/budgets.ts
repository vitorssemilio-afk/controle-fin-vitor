import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { shiftMonths } from "@/lib/billing-cycle";
import { getCategoryForUser } from "@/lib/categories";

export class InvalidBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBudgetError";
  }
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * How much was actually spent per category in a given month — counting
 * both regular expense transactions and credit card purchases (see Phase 3:
 * a card purchase is real spending the moment it happens, not when the
 * invoice gets paid). This is what a budget's progress bar is measured
 * against.
 */
export async function computeCategorySpending(
  userId: string,
  referenceMonth: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const start = monthStart(referenceMonth);
  const end = shiftMonths(start, 1);

  const spending = new Map<string, Prisma.Decimal>();

  const expenses = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  for (const row of expenses) {
    if (!row.categoryId) continue;
    spending.set(row.categoryId, row._sum.amount ?? new Prisma.Decimal(0));
  }

  const cardPurchases = await prisma.cardTransaction.groupBy({
    by: ["categoryId"],
    where: { userId, purchaseDate: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  for (const row of cardPurchases) {
    const sum = row._sum.amount ?? new Prisma.Decimal(0);
    const current = spending.get(row.categoryId) ?? new Prisma.Decimal(0);
    spending.set(row.categoryId, current.plus(sum));
  }

  return spending;
}

export interface UpsertBudgetInput {
  categoryId: string;
  referenceMonth: Date;
  limitAmount: number;
}

export async function upsertBudgetForUser(userId: string, input: UpsertBudgetInput) {
  if (input.limitAmount <= 0) {
    throw new InvalidBudgetError("O limite precisa ser maior que zero");
  }

  const category = await getCategoryForUser(userId, input.categoryId);
  if (!category) {
    throw new InvalidBudgetError("Categoria inválida");
  }
  if (category.kind !== "EXPENSE") {
    throw new InvalidBudgetError("Orçamento só se aplica a categorias de despesa");
  }

  const referenceMonth = monthStart(input.referenceMonth);

  return prisma.budget.upsert({
    where: {
      userId_categoryId_referenceMonth: { userId, categoryId: input.categoryId, referenceMonth },
    },
    update: { limitAmount: input.limitAmount },
    create: {
      userId,
      categoryId: input.categoryId,
      referenceMonth,
      limitAmount: input.limitAmount,
    },
  });
}

export interface CategoryBudgetOverview {
  categoryId: string;
  categoryName: string;
  limitAmount: Prisma.Decimal | null;
  spent: Prisma.Decimal;
  isOverBudget: boolean;
}

export async function listBudgetOverviewForUser(
  userId: string,
  referenceMonth: Date,
): Promise<CategoryBudgetOverview[]> {
  const start = monthStart(referenceMonth);

  const [categories, budgets, spending] = await Promise.all([
    prisma.category.findMany({ where: { userId, kind: "EXPENSE" }, orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { userId, referenceMonth: start } }),
    computeCategorySpending(userId, start),
  ]);

  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget]));

  return categories.map((category) => {
    const budget = budgetByCategory.get(category.id);
    const spent = spending.get(category.id) ?? new Prisma.Decimal(0);
    const limitAmount = budget?.limitAmount ?? null;

    return {
      categoryId: category.id,
      categoryName: category.name,
      limitAmount,
      spent,
      isOverBudget: limitAmount !== null && spent.gt(limitAmount),
    };
  });
}
