import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser } from "@/lib/accounts";
import { createTransactionForUser } from "@/lib/transactions";
import { listCategoriesForUser } from "@/lib/categories";
import {
  createSavingsGoalForUser,
  deleteSavingsGoalForUser,
  InvalidSavingsGoalError,
  listSavingsGoalsForUser,
} from "@/lib/savings-goals";

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
    initialBalance: 5000,
  });
  const savings = await createAccountForUser(user.id, {
    name: "Poupança viagem",
    type: "SAVINGS",
    currency: "BRL",
    initialBalance: 0,
  });
  const categories = await listCategoriesForUser(user.id);
  const expenseCategory = categories.find((c) => c.kind === "EXPENSE")!;

  return { user, checking, savings, expenseCategory };
}

describe("criação de metas", () => {
  it("meta sem conta vinculada não tem progresso nem projeção", async () => {
    const { user } = await setup();

    await createSavingsGoalForUser(user.id, {
      name: "Reserva",
      targetAmount: 1000,
      targetDate: new Date("2027-01-01T00:00:00Z"),
    });

    const [goal] = await listSavingsGoalsForUser(user.id);
    expect(goal.currentAmount.toString()).toBe("0");
    expect(goal.projection).toEqual({ status: "no-account" });
  });

  it("progresso da meta é o saldo real da conta poupança vinculada", async () => {
    const { user, checking, savings } = await setup();

    await createSavingsGoalForUser(user.id, {
      name: "Viagem",
      targetAmount: 2000,
      targetDate: new Date("2027-01-01T00:00:00Z"),
      linkedAccountId: savings.id,
    });

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      transferAccountId: savings.id,
      type: "TRANSFER",
      amount: 500,
      date: new Date(),
    });

    const [goal] = await listSavingsGoalsForUser(user.id);
    expect(goal.currentAmount.toString()).toBe("500");
    expect(goal.projection.status).toBe("insufficient-data"); // meta acabou de ser criada
  });

  it("meta atingida assim que o saldo alcança o valor alvo", async () => {
    const { user, checking, savings } = await setup();

    await createSavingsGoalForUser(user.id, {
      name: "Viagem",
      targetAmount: 300,
      targetDate: new Date("2027-01-01T00:00:00Z"),
      linkedAccountId: savings.id,
    });

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      transferAccountId: savings.id,
      type: "TRANSFER",
      amount: 500,
      date: new Date(),
    });

    const [goal] = await listSavingsGoalsForUser(user.id);
    expect(goal.projection).toEqual({ status: "reached" });
  });

  it("um saque da conta vinculada reduz o progresso da meta", async () => {
    const { user, checking, savings, expenseCategory } = await setup();

    await createSavingsGoalForUser(user.id, {
      name: "Viagem",
      targetAmount: 2000,
      targetDate: new Date("2027-01-01T00:00:00Z"),
      linkedAccountId: savings.id,
    });

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      transferAccountId: savings.id,
      type: "TRANSFER",
      amount: 500,
      date: new Date(),
    });
    await createTransactionForUser(user.id, {
      accountId: savings.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 100,
      date: new Date(),
    });

    const [goal] = await listSavingsGoalsForUser(user.id);
    expect(goal.currentAmount.toString()).toBe("400");
  });

  it("rejeita vincular uma conta que não é poupança", async () => {
    const { user, checking } = await setup();

    await expect(
      createSavingsGoalForUser(user.id, {
        name: "Viagem",
        targetAmount: 1000,
        targetDate: new Date("2027-01-01T00:00:00Z"),
        linkedAccountId: checking.id,
      }),
    ).rejects.toThrow(InvalidSavingsGoalError);
  });

  it("rejeita valor alvo zero ou negativo", async () => {
    const { user } = await setup();

    await expect(
      createSavingsGoalForUser(user.id, {
        name: "Viagem",
        targetAmount: 0,
        targetDate: new Date("2027-01-01T00:00:00Z"),
      }),
    ).rejects.toThrow(InvalidSavingsGoalError);
  });
});

describe("isolamento de metas entre usuários", () => {
  it("um usuário não vê nem apaga a meta de outro", async () => {
    const { user: userA } = await setup();
    const { user: userB } = await setup();

    const goal = await createSavingsGoalForUser(userA.id, {
      name: "Viagem",
      targetAmount: 1000,
      targetDate: new Date("2027-01-01T00:00:00Z"),
    });

    const goalsOfB = await listSavingsGoalsForUser(userB.id);
    expect(goalsOfB).toHaveLength(0);

    expect(await deleteSavingsGoalForUser(userB.id, goal.id)).toBe(false);
  });
});
