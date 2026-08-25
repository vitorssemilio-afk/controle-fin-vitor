import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a conta").max(80),
  type: z.enum(["CHECKING", "SAVINGS", "WALLET", "INVESTMENT"]),
  currency: z.string().trim().length(3, "Use o código de 3 letras, ex.: BRL").default("BRL"),
  initialBalance: z.coerce.number().finite().default(0),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a categoria").max(60),
  kind: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB")
    .optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a categoria").max(60).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB")
    .optional(),
});

export const transactionSchema = z
  .object({
    accountId: z.string().min(1, "Selecione a conta"),
    transferAccountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: z.coerce.number().positive("O valor precisa ser maior que zero"),
    date: z.coerce.date(),
    description: z.string().trim().max(280).optional(),
  })
  .refine((data) => data.type !== "TRANSFER" || !!data.transferAccountId, {
    message: "Informe a conta de destino da transferência",
    path: ["transferAccountId"],
  })
  .refine((data) => data.type === "TRANSFER" || !!data.categoryId, {
    message: "Informe a categoria",
    path: ["categoryId"],
  });

export const transactionFiltersSchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
