import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { shiftMonths } from "@/lib/billing-cycle";
import {
  createRecurringTransactionForUser,
  deleteRecurringTransactionForUser,
  InvalidRecurringTransactionError,
  syncRecurringTransactionsForUser,
} from "@/lib/recurring-transactions";
import { prisma } from "@/lib/prisma";

async function setup() {
  const user = await registerUser({
    name: "Vitor",
    email: `vitor-${Math.random()}@example.com`,
    password: "senha1234",
  });
  const checking = await createAccountForUser(user.id, {
    name: "Conta corrente",
    type: "CHECKING",
    currency: "BRL",
    initialBalance: 1000,
  });
  const categories = await listCategoriesForUser(user.id);
  const expenseCategory = categories.find((c) => c.kind === "EXPENSE")!;
  const incomeCategory = categories.find((c) => c.kind === "INCOME")!;

  return { user, checking, expenseCategory, incomeCategory };
}

describe("criação e geração de recorrências", () => {
  it("uma regra que começa hoje já gera o primeiro lançamento na criação", async () => {
    const { user, checking, expenseCategory } = await setup();

    await createRecurringTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 50,
      frequency: "MONTHLY",
      startDate: new Date(),
    });

    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount.toString()).toBe("50");
  });

  it("abrir o app depois de meses sem acessar gera todos os ciclos acumulados de uma vez", async () => {
    const { user, checking, expenseCategory } = await setup();
    const threeMonthsAgo = shiftMonths(new Date(), -3);

    await createRecurringTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 30,
      frequency: "MONTHLY",
      startDate: threeMonthsAgo,
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });
    // hoje, 3 meses atrás -> 4 ocorrências (mês 0, 1, 2 e 3)
    expect(transactions).toHaveLength(4);
    expect(transactions.every((t) => t.amount.toString() === "30")).toBe(true);
  });

  it("rodar a sincronização de novo não duplica lançamentos já gerados", async () => {
    const { user, checking, expenseCategory } = await setup();

    await createRecurringTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 30,
      frequency: "MONTHLY",
      startDate: new Date(),
    });

    await syncRecurringTransactionsForUser(user.id);
    await syncRecurringTransactionsForUser(user.id);

    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(transactions).toHaveLength(1);
  });

  it("rejeita categoria de tipo diferente da recorrência", async () => {
    const { user, checking, expenseCategory } = await setup();

    await expect(
      createRecurringTransactionForUser(user.id, {
        accountId: checking.id,
        categoryId: expenseCategory.id,
        type: "INCOME",
        amount: 30,
        frequency: "MONTHLY",
        startDate: new Date(),
      }),
    ).rejects.toThrow(InvalidRecurringTransactionError);
  });

  it("apagar a regra não apaga os lançamentos já criados", async () => {
    const { user, checking, expenseCategory } = await setup();

    const rule = await createRecurringTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 30,
      frequency: "MONTHLY",
      startDate: new Date(),
    });

    await deleteRecurringTransactionForUser(user.id, rule.id);

    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].recurringTransactionId).toBeNull();
  });
});

describe("isolamento de recorrências entre usuários", () => {
  it("um usuário não consegue apagar a recorrência de outro", async () => {
    const { user: userA, checking, expenseCategory } = await setup();
    const { user: userB } = await setup();

    const rule = await createRecurringTransactionForUser(userA.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 30,
      frequency: "MONTHLY",
      startDate: new Date(),
    });

    expect(await deleteRecurringTransactionForUser(userB.id, rule.id)).toBe(false);
  });
});
