import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import {
  createAccountForUser,
  getAccountForUser,
  listAccountsForUser,
} from "@/lib/accounts";

describe("isolamento de dados entre usuários", () => {
  it("um usuário não consegue buscar a conta de outro por id", async () => {
    const userA = await registerUser({
      name: "Usuário A",
      email: "a@example.com",
      password: "senha1234",
    });
    const userB = await registerUser({
      name: "Usuário B",
      email: "b@example.com",
      password: "senha1234",
    });

    const accountA = await createAccountForUser(userA.id, {
      name: "Conta da A",
      type: "CHECKING",
      currency: "BRL",
      initialBalance: 100,
    });

    const resultForOwner = await getAccountForUser(userA.id, accountA.id);
    expect(resultForOwner?.id).toBe(accountA.id);

    const resultForIntruder = await getAccountForUser(userB.id, accountA.id);
    expect(resultForIntruder).toBeNull();
  });

  it("a listagem de contas de um usuário não inclui contas de outro", async () => {
    const userA = await registerUser({
      name: "Usuário A",
      email: "a@example.com",
      password: "senha1234",
    });
    const userB = await registerUser({
      name: "Usuário B",
      email: "b@example.com",
      password: "senha1234",
    });

    await createAccountForUser(userA.id, {
      name: "Conta da A",
      type: "CHECKING",
      currency: "BRL",
      initialBalance: 0,
    });
    await createAccountForUser(userB.id, {
      name: "Conta da B",
      type: "WALLET",
      currency: "BRL",
      initialBalance: 0,
    });

    const accountsOfA = await listAccountsForUser(userA.id);

    expect(accountsOfA).toHaveLength(1);
    expect(accountsOfA[0].name).toBe("Conta da A");
  });
});
