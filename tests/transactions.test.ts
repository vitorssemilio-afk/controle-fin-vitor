import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser, computeAccountBalances } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import {
  createTransactionForUser,
  deleteTransactionForUser,
  getTransactionForUser,
  InvalidTransactionError,
  updateTransactionForUser,
} from "@/lib/transactions";

async function setupUserWithAccounts() {
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
  const savings = await createAccountForUser(user.id, {
    name: "Poupança",
    type: "SAVINGS",
    currency: "BRL",
    initialBalance: 0,
  });
  const categories = await listCategoriesForUser(user.id);
  const expenseCategory = categories.find((c) => c.kind === "EXPENSE")!;
  const incomeCategory = categories.find((c) => c.kind === "INCOME")!;

  return { user, checking, savings, expenseCategory, incomeCategory };
}

describe("cálculo de saldo", () => {
  it("soma receitas, subtrai despesas e move transferências entre contas", async () => {
    const { user, checking, savings, expenseCategory, incomeCategory } =
      await setupUserWithAccounts();

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: incomeCategory.id,
      type: "INCOME",
      amount: 500,
      date: new Date("2026-01-05"),
    });

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 200,
      date: new Date("2026-01-06"),
    });

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      transferAccountId: savings.id,
      type: "TRANSFER",
      amount: 300,
      date: new Date("2026-01-07"),
    });

    const balances = await computeAccountBalances(user.id);

    // 1000 (inicial) + 500 (receita) - 200 (despesa) - 300 (transferência enviada)
    expect(balances.get(checking.id)?.toString()).toBe("1000");
    // 0 (inicial) + 300 (transferência recebida)
    expect(balances.get(savings.id)?.toString()).toBe("300");
  });
});

describe("regras de transação", () => {
  it("rejeita categoria de tipo diferente da transação", async () => {
    const { user, checking, expenseCategory } = await setupUserWithAccounts();

    await expect(
      createTransactionForUser(user.id, {
        accountId: checking.id,
        categoryId: expenseCategory.id,
        type: "INCOME",
        amount: 100,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);
  });

  it("rejeita transferência com categoria", async () => {
    const { user, checking, savings, expenseCategory } = await setupUserWithAccounts();

    await expect(
      createTransactionForUser(user.id, {
        accountId: checking.id,
        transferAccountId: savings.id,
        categoryId: expenseCategory.id,
        type: "TRANSFER",
        amount: 100,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);
  });

  it("rejeita transferência para a mesma conta", async () => {
    const { user, checking } = await setupUserWithAccounts();

    await expect(
      createTransactionForUser(user.id, {
        accountId: checking.id,
        transferAccountId: checking.id,
        type: "TRANSFER",
        amount: 100,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);
  });

  it("rejeita valor zero ou negativo", async () => {
    const { user, checking, expenseCategory } = await setupUserWithAccounts();

    await expect(
      createTransactionForUser(user.id, {
        accountId: checking.id,
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: 0,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);
  });

  it("rejeita conta ou categoria de outro usuário", async () => {
    const { user: userA, checking: checkingA } = await setupUserWithAccounts();
    const { checking: checkingB, expenseCategory: expenseCategoryB } =
      await setupUserWithAccounts();

    await expect(
      createTransactionForUser(userA.id, {
        accountId: checkingB.id,
        categoryId: expenseCategoryB.id,
        type: "EXPENSE",
        amount: 50,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);

    await expect(
      createTransactionForUser(userA.id, {
        accountId: checkingA.id,
        categoryId: expenseCategoryB.id,
        type: "EXPENSE",
        amount: 50,
        date: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(InvalidTransactionError);
  });
});

describe("isolamento de transações entre usuários", () => {
  it("um usuário não consegue ler, editar ou excluir a transação de outro", async () => {
    const { user: userA, checking: checkingA, expenseCategory: categoryA } =
      await setupUserWithAccounts();
    const { user: userB } = await setupUserWithAccounts();

    const transaction = await createTransactionForUser(userA.id, {
      accountId: checkingA.id,
      categoryId: categoryA.id,
      type: "EXPENSE",
      amount: 80,
      date: new Date("2026-01-01"),
    });

    expect(await getTransactionForUser(userB.id, transaction.id)).toBeNull();

    const updateResult = await updateTransactionForUser(userB.id, transaction.id, {
      accountId: checkingA.id,
      categoryId: categoryA.id,
      type: "EXPENSE",
      amount: 999,
      date: new Date("2026-01-01"),
    });
    expect(updateResult).toBeNull();

    expect(await deleteTransactionForUser(userB.id, transaction.id)).toBe(false);

    const stillThere = await getTransactionForUser(userA.id, transaction.id);
    expect(stillThere?.amount.toString()).toBe("80");
  });
});
