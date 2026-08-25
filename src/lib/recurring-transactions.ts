import { prisma } from "@/lib/prisma";
import { getAccountForUser } from "@/lib/accounts";
import { getCategoryForUser } from "@/lib/categories";
import { createTransactionForUser } from "@/lib/transactions";
import { occurrencesToGenerate, type RecurrenceFrequency } from "@/lib/recurrence";

export class InvalidRecurringTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRecurringTransactionError";
  }
}

export interface RecurringTransactionInput {
  accountId: string;
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description?: string | null;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate?: Date | null;
}

async function assertValidRecurringTransaction(userId: string, input: RecurringTransactionInput) {
  const account = await getAccountForUser(userId, input.accountId);
  if (!account) {
    throw new InvalidRecurringTransactionError("Conta inválida");
  }
  if (input.amount <= 0) {
    throw new InvalidRecurringTransactionError("O valor precisa ser maior que zero");
  }
  const category = await getCategoryForUser(userId, input.categoryId);
  if (!category) {
    throw new InvalidRecurringTransactionError("Categoria inválida");
  }
  if (category.kind !== input.type) {
    throw new InvalidRecurringTransactionError(
      `A categoria "${category.name}" não é do tipo ${input.type === "INCOME" ? "receita" : "despesa"}`,
    );
  }
  if (input.endDate && input.endDate < input.startDate) {
    throw new InvalidRecurringTransactionError("A data final precisa ser depois da data inicial");
  }
}

export async function createRecurringTransactionForUser(
  userId: string,
  input: RecurringTransactionInput,
) {
  await assertValidRecurringTransaction(userId, input);

  const rule = await prisma.recurringTransaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description ?? null,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
    },
  });

  await syncRecurringTransactionsForUser(userId);

  return rule;
}

export function listRecurringTransactionsForUser(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: { account: true, category: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteRecurringTransactionForUser(userId: string, id: string) {
  const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId } });
  return count > 0;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Catches every recurring rule of a user up to today, creating whatever
 * real transactions are due since the last time this ran. Safe to call on
 * every page load: when nothing is due it does no writes at all.
 */
export async function syncRecurringTransactionsForUser(userId: string) {
  const rules = await prisma.recurringTransaction.findMany({ where: { userId } });
  const today = startOfToday();

  for (const rule of rules) {
    const occurrences = occurrencesToGenerate({
      frequency: rule.frequency,
      startDate: rule.startDate,
      lastGeneratedDate: rule.lastGeneratedDate,
      endDate: rule.endDate,
      today,
    });

    if (occurrences.length === 0) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const occurrence of occurrences) {
        await createTransactionForUser(
          userId,
          {
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            recurringTransactionId: rule.id,
            type: rule.type,
            amount: rule.amount.toNumber(),
            date: occurrence,
            description: rule.description,
          },
          tx,
        );
      }

      await tx.recurringTransaction.update({
        where: { id: rule.id },
        data: { lastGeneratedDate: occurrences[occurrences.length - 1] },
      });
    });
  }
}
