import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { computeAccountBalances, computeAccountNetChangeSince, getAccountForUser } from "@/lib/accounts";
import { projectGoalCompletion, type GoalProjection } from "@/lib/savings-projection";

export class InvalidSavingsGoalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSavingsGoalError";
  }
}

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: number;
  targetDate: Date;
  linkedAccountId?: string | null;
}

export async function createSavingsGoalForUser(userId: string, input: CreateSavingsGoalInput) {
  if (input.targetAmount <= 0) {
    throw new InvalidSavingsGoalError("O valor alvo precisa ser maior que zero");
  }

  if (input.linkedAccountId) {
    const account = await getAccountForUser(userId, input.linkedAccountId);
    if (!account) {
      throw new InvalidSavingsGoalError("Conta inválida");
    }
    if (account.type !== "SAVINGS") {
      throw new InvalidSavingsGoalError("Só é possível vincular uma conta do tipo poupança");
    }
  }

  return prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      linkedAccountId: input.linkedAccountId ?? null,
    },
  });
}

export async function deleteSavingsGoalForUser(userId: string, id: string) {
  const { count } = await prisma.savingsGoal.deleteMany({ where: { id, userId } });
  return count > 0;
}

export interface SavingsGoalOverview {
  id: string;
  name: string;
  targetAmount: Prisma.Decimal;
  targetDate: Date;
  linkedAccountName: string | null;
  currentAmount: Prisma.Decimal;
  projection: GoalProjection;
}

export async function listSavingsGoalsForUser(userId: string): Promise<SavingsGoalOverview[]> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: { linkedAccount: true },
    orderBy: { createdAt: "asc" },
  });

  if (goals.length === 0) {
    return [];
  }

  const balances = await computeAccountBalances(userId);
  const today = new Date();

  return Promise.all(
    goals.map(async (goal) => {
      const currentAmount = goal.linkedAccountId
        ? (balances.get(goal.linkedAccountId) ?? new Prisma.Decimal(0))
        : new Prisma.Decimal(0);

      let netChangeSinceStart = new Prisma.Decimal(0);
      if (goal.linkedAccountId) {
        netChangeSinceStart = await computeAccountNetChangeSince(
          userId,
          goal.linkedAccountId,
          goal.createdAt,
        );
      }

      const daysElapsed = Math.floor((today.getTime() - goal.createdAt.getTime()) / 86_400_000);

      const projection = projectGoalCompletion({
        hasLinkedAccount: Boolean(goal.linkedAccountId),
        targetAmount: goal.targetAmount.toNumber(),
        currentAmount: currentAmount.toNumber(),
        netChangeSinceStart: netChangeSinceStart.toNumber(),
        daysElapsed,
        today,
      });

      return {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate,
        linkedAccountName: goal.linkedAccount?.name ?? null,
        currentAmount,
        projection,
      };
    }),
  );
}
