import { requireCurrentUserId } from "@/lib/current-user";
import { listAccountsForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { listRecurringTransactionsForUser } from "@/lib/recurring-transactions";
import { NewRecurringForm } from "@/components/new-recurring-form";
import { RecurringList } from "@/components/recurring-list";

export default async function RecurringPage() {
  const userId = await requireCurrentUserId();

  const [accounts, categories, rules] = await Promise.all([
    listAccountsForUser(userId),
    listCategoriesForUser(userId),
    listRecurringTransactionsForUser(userId),
  ]);

  const items = rules.map((rule) => ({
    id: rule.id,
    description: rule.description,
    categoryName: rule.category.name,
    accountName: rule.account.name,
    amount: rule.amount.toString(),
    type: rule.type as "INCOME" | "EXPENSE",
    frequency: rule.frequency,
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Recorrências</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Assinaturas, salário, aluguel — lançados automaticamente a cada ciclo.
      </p>

      <div className="mt-6">
        <RecurringList items={items} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-ink-soft">Nova recorrência</h2>
        <div className="mt-2">
          <NewRecurringForm
            accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              kind: category.kind,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
