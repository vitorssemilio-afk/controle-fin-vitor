import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import {
  createCategoryForUser,
  DEFAULT_CATEGORIES,
  getCategoryForUser,
  listCategoriesForUser,
  updateCategoryForUser,
} from "@/lib/categories";

describe("categorias padrão", () => {
  it("são criadas para cada usuário no cadastro", async () => {
    const user = await registerUser({
      name: "Vitor",
      email: "vitor@example.com",
      password: "senha1234",
    });

    const categories = await listCategoriesForUser(user.id);
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it("editar a categoria de um usuário não afeta a de outro com o mesmo nome", async () => {
    const userA = await registerUser({
      name: "A",
      email: "a@example.com",
      password: "senha1234",
    });
    const userB = await registerUser({
      name: "B",
      email: "b@example.com",
      password: "senha1234",
    });

    const categoriesA = await listCategoriesForUser(userA.id);
    const mercadoA = categoriesA.find((c) => c.name === "Mercado")!;

    await updateCategoryForUser(userA.id, mercadoA.id, { name: "Supermercado" });

    const categoriesB = await listCategoriesForUser(userB.id);
    const mercadoB = categoriesB.find((c) => c.name === "Mercado")!;

    expect(mercadoB).toBeDefined();
  });
});

describe("isolamento de categorias entre usuários", () => {
  it("um usuário não enxerga nem edita a categoria de outro", async () => {
    const userA = await registerUser({
      name: "A",
      email: "a@example.com",
      password: "senha1234",
    });
    const userB = await registerUser({
      name: "B",
      email: "b@example.com",
      password: "senha1234",
    });

    const customCategory = await createCategoryForUser(userA.id, {
      name: "Viagens",
      kind: "EXPENSE",
    });

    expect(await getCategoryForUser(userB.id, customCategory.id)).toBeNull();

    const updated = await updateCategoryForUser(userB.id, customCategory.id, {
      name: "Hackeado",
    });
    expect(updated).toBe(false);
  });
});
