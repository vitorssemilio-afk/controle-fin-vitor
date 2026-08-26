"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleGoogle() {
    setIsGoogleSubmitting(true);
    await signIn("google", { callbackUrl: "/" });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar sua conta");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Conta criada, mas não foi possível entrar automaticamente. Faça login.");
        router.push("/login");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12 sm:mx-auto sm:w-full sm:max-w-sm">
      <h1 className="font-heading text-3xl text-ink">Criar conta</h1>
      <p className="mt-2 text-ink-soft">Comece a organizar suas finanças.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Nome" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </Field>

        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Senha" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        {error ? <p className="text-sm text-negative">{error}</p> : null}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="ghost"
        disabled={isGoogleSubmitting}
        onClick={handleGoogle}
        className="mt-4"
      >
        {isGoogleSubmitting ? "Redirecionando..." : "Continuar com Google"}
      </Button>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium">
          Entrar
        </Link>
      </p>
    </main>
  );
}
