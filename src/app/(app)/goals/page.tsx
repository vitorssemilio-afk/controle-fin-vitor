import { requireCurrentUserId } from "@/lib/current-user";
import { listAccountsForUser } from "@/lib/accounts";
import { listSavingsGoalsForUser } from "@/lib/savings-goals";
import type { GoalProjection } from "@/lib/savings-projection";
import { NewGoalForm } from "@/components/new-goal-form";
import { GoalsList, type GoalItem } from "@/components/goals-list";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

function describeProjection(projection: GoalProjection): {
  message: string;
  tone: GoalItem["projectionTone"];
} {
  switch (projection.status) {
    case "no-account":
      return {
        message: "Vincule uma conta poupança para acompanhar o progresso e a projeção automaticamente.",
        tone: "neutral",
      };
    case "insufficient-data":
      return {
        message: "Ainda não há histórico suficiente (menos de 30 dias) para projetar quando a meta será atingida.",
        tone: "neutral",
      };
    case "reached":
      return { message: "Meta atingida.", tone: "positive" };
    case "not-on-track":
      return {
        message: "No ritmo atual, o saldo não está crescendo — não é possível projetar quando a meta será atingida.",
        tone: "negative",
      };
    case "projected": {
      const months = Math.ceil(projection.monthsRemaining);
      return {
        message: `No ritmo atual, deve levar cerca de ${months} ${months === 1 ? "mês" : "meses"} (${formatMonthYear(projection.projectedDate)}).`,
        tone: "positive",
      };
    }
  }
}

export default async function GoalsPage() {
  const userId = await requireCurrentUserId();

  const [accounts, goals] = await Promise.all([listAccountsForUser(userId), listSavingsGoalsForUser(userId)]);
  const savingsAccounts = accounts.filter((account) => account.type === "SAVINGS");

  const items: GoalItem[] = goals.map((goal) => {
    const target = goal.targetAmount.toNumber();
    const current = goal.currentAmount.toNumber();
    const { message, tone } = describeProjection(goal.projection);

    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      percentage: target > 0 ? Math.min((current / target) * 100, 100) : 0,
      targetDateLabel: formatDate(goal.targetDate),
      linkedAccountName: goal.linkedAccountName,
      projectionMessage: message,
      projectionTone: tone,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Metas de poupança</h1>

      <div className="mt-6">
        <GoalsList items={items} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-ink-soft">Nova meta</h2>
        <div className="mt-2">
          <NewGoalForm
            savingsAccounts={savingsAccounts.map((account) => ({ id: account.id, name: account.name }))}
          />
        </div>
      </div>
    </main>
  );
}
