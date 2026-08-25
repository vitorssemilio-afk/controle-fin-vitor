import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

if (!process.env.DATABASE_URL?.includes("controle_fin_test")) {
  throw new Error(
    "Testes precisam rodar contra o banco de teste (controle_fin_test). " +
      "Rode com `npm test`, que carrega .env.test.",
  );
}

beforeEach(async () => {
  await prisma.financialAccount.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
