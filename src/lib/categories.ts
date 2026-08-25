import { prisma } from "@/lib/prisma";
import type { CategoryKind, Prisma } from "@/generated/prisma/client";

export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind }[] = [
  { name: "Moradia", kind: "EXPENSE" },
  { name: "Mercado", kind: "EXPENSE" },
  { name: "Transporte", kind: "EXPENSE" },
  { name: "Saúde", kind: "EXPENSE" },
  { name: "Lazer", kind: "EXPENSE" },
  { name: "Educação", kind: "EXPENSE" },
  { name: "Assinaturas", kind: "EXPENSE" },
  { name: "Outros", kind: "EXPENSE" },
  { name: "Salário", kind: "INCOME" },
  { name: "Freelance", kind: "INCOME" },
  { name: "Investimentos", kind: "INCOME" },
  { name: "Outros", kind: "INCOME" },
];

/**
 * Runs inside the same transaction as user creation so a user never exists
 * without their default categories.
 */
export function seedDefaultCategories(tx: Prisma.TransactionClient, userId: string) {
  return tx.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })),
  });
}

export function listCategoriesForUser(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export function getCategoryForUser(userId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
}

export interface CreateCategoryInput {
  name: string;
  kind: CategoryKind;
  color?: string;
}

export function createCategoryForUser(userId: string, input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      kind: input.kind,
      ...(input.color ? { color: input.color } : {}),
    },
  });
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export async function updateCategoryForUser(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const { count } = await prisma.category.updateMany({
    where: { id: categoryId, userId },
    data: input,
  });
  return count > 0;
}
