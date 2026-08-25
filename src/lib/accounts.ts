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
  asOf?: Date,
): Promise<Map<string, Prisma.Decimal>> {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId },
    select: { id: true, initialBalance: true },
  });

  const balances = new Map<string, Prisma.Decimal>(
    accounts.map((account) => [account.id, account.initialBalance]),
  );

  const dateFilter = asOf ? { lte: asOf } : undefined;

  const movements = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
    _sum: { amount: true },
  });

  const transferCredits = await prisma.transaction.groupBy({
    by: ["transferAccountId"],
    where: { userId, type: "TRANSFER", ...(dateFilter ? { date: dateFilter } : {}) },
    _sum: { amount: true },
  });

  for (const movement of movements) {
    const sum = movement._sum.amount ?? new Prisma.Decimal(0);
    const current = balances.get(movement.accountId) ?? new Prisma.Decimal(0);
    const signed =
      movement.type === "EXPENSE" || movement.type === "TRANSFER" || movement.type === "CARD_PAYMENT"
        ? sum.negated()
        : sum;
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

/**
 * Total across every account of the user as of a given moment (or right
 * now) — the "patrimônio" figure. Built on the same never-stored balance
 * calculation as everything else.
 */
export async function computeTotalNetWorth(userId: string, asOf?: Date): Promise<Prisma.Decimal> {
  const balances = await computeAccountBalances(userId, asOf);
  let total = new Prisma.Decimal(0);
  for (const balance of balances.values()) {
    total = total.plus(balance);
  }
  return total;
}

/**
 * Net signed change in a single account's balance since a given date —
 * the same sign rules as computeAccountBalances, just scoped to one
 * account and a time window. Used to measure "how fast is this account
 * actually growing" for savings goal projections.
 */
export async function computeAccountNetChangeSince(
  userId: string,
  accountId: string,
  since: Date,
): Promise<Prisma.Decimal> {
  const outgoing = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, accountId, date: { gte: since } },
    _sum: { amount: true },
  });

  let net = new Prisma.Decimal(0);
  for (const row of outgoing) {
    const sum = row._sum.amount ?? new Prisma.Decimal(0);
    const signed =
      row.type === "EXPENSE" || row.type === "TRANSFER" || row.type === "CARD_PAYMENT"
        ? sum.negated()
        : sum;
    net = net.plus(signed);
  }

  const incoming = await prisma.transaction.aggregate({
    where: { userId, transferAccountId: accountId, type: "TRANSFER", date: { gte: since } },
    _sum: { amount: true },
  });
  net = net.plus(incoming._sum.amount ?? new Prisma.Decimal(0));

  return net;
}
