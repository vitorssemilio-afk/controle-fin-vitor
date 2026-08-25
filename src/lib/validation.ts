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
