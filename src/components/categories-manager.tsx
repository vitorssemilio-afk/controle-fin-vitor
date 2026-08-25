"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export interface CategoryItem {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  color: string;
}

function CategoryRow({ category }: { category: CategoryItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível salvar");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="flex items-center gap-2 px-4 py-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <Input value={name} onChange={(e) => setName(e.target.value)} className="py-1.5" autoFocus />
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-sm font-medium text-primary disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setName(category.name);
            setError(null);
          }}
          className="text-sm text-ink-soft"
        >
          Cancelar
        </button>
        {error ? <span className="text-sm text-negative">{error}</span> : null}
      </form>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-ink/5"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      <span className="text-ink">{category.name}</span>
    </button>
  );
}

export function CategoriesManager({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.kind === "INCOME");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar a categoria");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-sm font-medium text-ink-soft">Despesas</h2>
        <div className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
          {expenseCategories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink-soft">Receitas</h2>
        <div className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
          {incomeCategories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink-soft">Nova categoria</h2>
        <form onSubmit={handleCreate} className="mt-2 flex flex-col gap-3">
          <Field label="Nome" htmlFor="new-category-name">
            <Input id="new-category-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Tipo" htmlFor="new-category-kind">
            <Select
              id="new-category-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "INCOME" | "EXPENSE")}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </Select>
          </Field>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar categoria"}
          </Button>
        </form>
      </section>
    </div>
  );
}
