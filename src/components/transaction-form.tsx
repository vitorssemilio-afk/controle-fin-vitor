"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export interface TransactionFormAccount {
  id: string;
  name: string;
}

export interface TransactionFormCategory {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
}

export interface TransactionFormValues {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;
  transferAccountId: string;
  categoryId: string;
  amount: string;
  date: string;
  description: string;
}

const TYPE_LABELS: Record<TransactionFormValues["type"], string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyTransactionFormValues(): TransactionFormValues {
  return {
    type: "EXPENSE",
    accountId: "",
    transferAccountId: "",
    categoryId: "",
    amount: "",
    date: today(),
    description: "",
  };
}

export function TransactionForm({
  accounts,
  categories,
  initialValues,
  submitLabel,
  onSubmit,
  extra,
}: {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  initialValues: TransactionFormValues;
  submitLabel: string;
  onSubmit: (values: TransactionFormValues) => Promise<string | null>;
  extra?: React.ReactNode;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.kind === values.type),
    [categories, values.type],
  );

  const transferAccountOptions = useMemo(
    () => accounts.filter((account) => account.id !== values.accountId),
    [accounts, values.accountId],
  );

  function update<K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const submitError = await onSubmit(values);
      if (submitError) {
        setError(submitError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Tipo" htmlFor="type">
        <Select
          id="type"
          value={values.type}
          onChange={(e) => {
            const type = e.target.value as TransactionFormValues["type"];
            update("type", type);
            update("categoryId", "");
          }}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={values.type === "TRANSFER" ? "Conta de origem" : "Conta"} htmlFor="accountId">
        <Select
          id="accountId"
          value={values.accountId}
          onChange={(e) => update("accountId", e.target.value)}
          required
        >
          <option value="" disabled>
            Selecione
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      {values.type === "TRANSFER" ? (
        <Field label="Conta de destino" htmlFor="transferAccountId">
          <Select
            id="transferAccountId"
            value={values.transferAccountId}
            onChange={(e) => update("transferAccountId", e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione
            </option>
            {transferAccountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Categoria" htmlFor="categoryId">
          <Select
            id="categoryId"
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione
            </option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="amount">
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
          />
        </Field>

        <Field label="Data" htmlFor="date">
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Descrição (opcional)" htmlFor="description">
        <Input
          id="description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </Field>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>

      {extra}
    </form>
  );
}
