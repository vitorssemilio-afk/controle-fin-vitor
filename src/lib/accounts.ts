import { prisma } from "@/lib/prisma";
import type { AccountType } from "@/generated/prisma/client";

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
