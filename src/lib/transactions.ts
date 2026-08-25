import { prisma } from "@/lib/prisma";
import { getAccountForUser } from "@/lib/accounts";
import { getCategoryForUser } from "@/lib/categories";
import type { Prisma, TransactionType } from "@/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

export class InvalidTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransactionError";
  }
}

export interface TransactionInput {
  accountId: string;
  transferAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  date: Date;
  description?: string | null;
}

/**
 * Enforces the invariants that keep the ledger meaningful:
 * - INCOME/EXPENSE always have a category whose kind matches the transaction type.
 * - TRANSFER never has a category, always has a distinct destination account.
 * - CARD_PAYMENT never has a category or a destination account — it's created
 *   only by paying an invoice (see src/lib/invoices.ts), never by the user directly.
 * Every id referenced (account, transfer account, category) must belong to
 * the same user — this is what makes it safe to trust the input.
 */
async function assertValidTransaction(userId: string, input: TransactionInput) {
  const account = await getAccountForUser(userId, input.accountId);
  if (!account) {
    throw new InvalidTransactionError("Conta de origem inválida");
  }

  if (input.amount <= 0) {
    throw new InvalidTransactionError("O valor precisa ser maior que zero");
  }

  if (input.type === "TRANSFER") {
    if (!input.transferAccountId) {
      throw new InvalidTransactionError("Informe a conta de destino da transferência");
    }
    if (input.transferAccountId === input.accountId) {
      throw new InvalidTransactionError("A conta de destino precisa ser diferente da origem");
    }
    const destination = await getAccountForUser(userId, input.transferAccountId);
    if (!destination) {
      throw new InvalidTransactionError("Conta de destino inválida");
    }
    if (input.categoryId) {
      throw new InvalidTransactionError("Transferências não têm categoria");
    }
    return;
  }

  if (input.type === "CARD_PAYMENT") {
    if (input.transferAccountId || input.categoryId) {
      throw new InvalidTransactionError("Pagamento de fatura não tem categoria nem conta de destino");
    }
    return;
  }

  if (input.transferAccountId) {
    throw new InvalidTransactionError("Apenas transferências têm conta de destino");
  }

  if (!input.categoryId) {
    throw new InvalidTransactionError("Informe a categoria");
  }

  const category = await getCategoryForUser(userId, input.categoryId);
  if (!category) {
    throw new InvalidTransactionError("Categoria inválida");
  }
  if (category.kind !== input.type) {
    throw new InvalidTransactionError(
      `A categoria "${category.name}" não é do tipo ${input.type === "INCOME" ? "receita" : "despesa"}`,
    );
  }
}

export async function createTransactionForUser(
  userId: string,
  input: TransactionInput,
  client: DbClient = prisma,
) {
  await assertValidTransaction(userId, input);

  return client.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      transferAccountId: input.type === "TRANSFER" ? input.transferAccountId : null,
      categoryId: input.type === "INCOME" || input.type === "EXPENSE" ? input.categoryId : null,
      type: input.type,
      amount: input.amount,
      date: input.date,
      description: input.description ?? null,
    },
  });
}

export async function updateTransactionForUser(
  userId: string,
  transactionId: string,
  input: TransactionInput,
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) {
    return null;
  }
  if (existing.type === "CARD_PAYMENT") {
    throw new InvalidTransactionError("Pagamento de fatura não pode ser editado aqui");
  }

  await assertValidTransaction(userId, input);

  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      accountId: input.accountId,
      transferAccountId: input.type === "TRANSFER" ? input.transferAccountId : null,
      categoryId: input.type === "TRANSFER" ? null : input.categoryId,
      type: input.type,
      amount: input.amount,
      date: input.date,
      description: input.description ?? null,
    },
  });
}

export async function deleteTransactionForUser(userId: string, transactionId: string) {
  const { count } = await prisma.transaction.deleteMany({
    where: { id: transactionId, userId, type: { not: "CARD_PAYMENT" } },
  });
  return count > 0;
}

export function getTransactionForUser(userId: string, transactionId: string) {
  return prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
}

export function listTransactionsForUser(userId: string, filters: TransactionFilters = {}) {
  return prisma.transaction.findMany({
    where: {
      userId,
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    include: { account: true, transferAccount: true, category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}
