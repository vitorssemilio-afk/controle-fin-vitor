import { prisma } from "@/lib/prisma";

export interface CreateCreditCardInput {
  name: string;
  closingDay: number;
  dueDay: number;
}

export function listCardsForUser(userId: string) {
  return prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export function getCardForUser(userId: string, cardId: string) {
  return prisma.creditCard.findFirst({
    where: { id: cardId, userId },
  });
}

export function createCardForUser(userId: string, input: CreateCreditCardInput) {
  return prisma.creditCard.create({
    data: {
      userId,
      name: input.name,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
    },
  });
}
