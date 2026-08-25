import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentUserId } from "@/lib/current-user";
import { computeAccountBalances, listAccountsForUser } from "@/lib/accounts";
import { formatMoney, ACCOUNT_TYPE_LABELS } from "@/lib/format";
import { syncRecurringTransactionsForUser } from "@/lib/recurring-transactions";

export default async function DashboardPage() {
  const userId = await requireCurrentUserId();
  await syncRecurringTransactionsForUser(userId);
  const accounts = await listAccountsForUser(userId);

  if (accounts.length === 0) {
    redirect("/onboarding");
  }

  const balances = await computeAccountBalances(userId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Suas contas</h1>

      <ul className="mt-6 flex flex-col gap-3">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
          >
            <div>
              <p className="font-medium text-ink">{account.name}</p>
              <p className="text-sm text-ink-soft">{ACCOUNT_TYPE_LABELS[account.type]}</p>
            </div>
            <p className="font-amount text-ink">
              {formatMoney(
                (balances.get(account.id) ?? account.initialBalance).toString(),
                account.currency,
              )}
            </p>
          </li>
        ))}
      </ul>

      <Link href="/onboarding" className="mt-6 text-center text-sm font-medium text-primary">
        + Adicionar outra conta
      </Link>
    </main>
  );
}
