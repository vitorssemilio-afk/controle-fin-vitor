import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("E-mail já cadastrado");
    this.name = "EmailAlreadyInUseError";
  }
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new EmailAlreadyInUseError();
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
    },
  });
}
