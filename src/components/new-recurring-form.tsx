"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export interface RecurringFormAccount {
  id: string;
  name: string;
}

export interface RecurringFormCategory {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
}

const FREQUENCY_LABELS = { WEEKLY: "Semanal", MONTHLY: "Mensal", YEARLY: "Anual" } as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewRecurringForm({
  accounts,
  categories,
}: {
  accounts: RecurringFormAccount[];
  categories: RecurringFormCategory[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.kind === type),
    [categories, type],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          accountId,
          categoryId,
          amount: amount.replace(",", "."),
          frequency,
          startDate,
          endDate: endDate || undefined,
          description: description || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar a recorrência");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Tipo" htmlFor="rec-type">
        <Select
          id="rec-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as "INCOME" | "EXPENSE");
            setCategoryId("");
          }}
        >
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </Select>
      </Field>

      <Field label="Conta" htmlFor="rec-account">
        <Select id="rec-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Categoria" htmlFor="rec-category">
        <Select
          id="rec-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
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

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" htmlFor="rec-amount">
          <Input
            id="rec-amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Frequência" htmlFor="rec-frequency">
          <Select
            id="rec-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "WEEKLY" | "MONTHLY" | "YEARLY")}
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Começa em" htmlFor="rec-start">
          <Input
            id="rec-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Termina em (opcional)" htmlFor="rec-end">
          <Input id="rec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Descrição (opcional)" htmlFor="rec-description">
        <Input id="rec-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Criando..." : "Criar recorrência"}
      </Button>
    </form>
  );
}
