import Link from "next/link";
import { requireCurrentUserId } from "@/lib/current-user";
import { listAccountsForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { listTransactionsForUser } from "@/lib/transactions";
import { formatMoney } from "@/lib/format";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const TYPE_SIGN: Record<string, string> = { INCOME: "+", EXPENSE: "-", TRANSFER: "" };
const TYPE_COLOR: Record<string, string> = {
  INCOME: "text-positive",
  EXPENSE: "text-negative",
  TRANSFER: "text-ink-soft",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const userId = await requireCurrentUserId();
  const params = await searchParams;

  const [accounts, categories, transactions] = await Promise.all([
    listAccountsForUser(userId),
    listCategoriesForUser(userId),
    listTransactionsForUser(userId, {
      accountId: params.accountId || undefined,
      categoryId: params.categoryId || undefined,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-ink">Transações</h1>
        <Link href="/transactions/new">
          <span className="text-sm font-medium text-primary">+ Nova</span>
        </Link>
      </div>

      <form method="get" className="mt-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <Select name="accountId" defaultValue={params.accountId ?? ""}>
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>

          <Select name="categoryId" defaultValue={params.categoryId ?? ""}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
          />
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
          />
        </div>

        <Button type="submit" variant="ghost">
          Filtrar
        </Button>
      </form>

      {transactions.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-soft">
          Nenhuma transação encontrada para este filtro.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <Link
                href={`/transactions/${transaction.id}/edit`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {transaction.type === "TRANSFER"
                      ? `${transaction.account.name} → ${transaction.transferAccount?.name ?? ""}`
                      : (transaction.description || transaction.category?.name || "Sem descrição")}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {new Intl.DateTimeFormat("pt-BR").format(transaction.date)}
                    {transaction.category ? ` · ${transaction.category.name}` : ""}
                    {transaction.type !== "TRANSFER" ? ` · ${transaction.account.name}` : ""}
                  </p>
                </div>
                <p className={`font-amount shrink-0 pl-3 ${TYPE_COLOR[transaction.type]}`}>
                  {TYPE_SIGN[transaction.type]}
                  {formatMoney(transaction.amount.toString(), transaction.account.currency)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
