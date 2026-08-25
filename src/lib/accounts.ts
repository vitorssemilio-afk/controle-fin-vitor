import { prisma } from "@/lib/prisma";
import { Prisma, type AccountType } from "@/generated/prisma/client";

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
}

/**
 * All functions here take an explicit userId and filter every query by it.
 * There is no function in this module that can read or write another
 * user's data, even if the caller passes a wrong id by mistake.
 */

export function listAccountsForUser(userId: string) {
  return prisma.financialAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export function createAccountForUser(userId: string, input: CreateAccountInput) {
  return prisma.financialAccount.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      initialBalance: input.initialBalance,
    },
  });
}

export function getAccountForUser(userId: string, accountId: string) {
  return prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
  });
}

/**
 * Balance is never stored — it's always initialBalance plus everything
 * that has moved through the account's transactions. Computed once for
 * every account of a user via a single grouped query (not N+1).
 */
export async function computeAccountBalances(
  userId: string,
): Promise<Map<string, Prisma.Decimal>> {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId },
    select: { id: true, initialBalance: true },
  });

  const balances = new Map<string, Prisma.Decimal>(
    accounts.map((account) => [account.id, account.initialBalance]),
  );

  const movements = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId },
    _sum: { amount: true },
  });

  const transferCredits = await prisma.transaction.groupBy({
    by: ["transferAccountId"],
    where: { userId, type: "TRANSFER" },
    _sum: { amount: true },
  });

  for (const movement of movements) {
    const sum = movement._sum.amount ?? new Prisma.Decimal(0);
    const current = balances.get(movement.accountId) ?? new Prisma.Decimal(0);
    const signed = movement.type === "EXPENSE" || movement.type === "TRANSFER" ? sum.negated() : sum;
    balances.set(movement.accountId, current.plus(signed));
  }

  for (const credit of transferCredits) {
    if (!credit.transferAccountId) continue;
    const sum = credit._sum.amount ?? new Prisma.Decimal(0);
    const current = balances.get(credit.transferAccountId) ?? new Prisma.Decimal(0);
    balances.set(credit.transferAccountId, current.plus(sum));
  }

  return balances;
}
