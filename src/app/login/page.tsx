"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12 sm:mx-auto sm:w-full sm:max-w-sm">
      <h1 className="font-heading text-3xl text-ink">Entrar</h1>
      <p className="mt-2 text-ink-soft">Acesse seu controle financeiro.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
            autoComplete="current-password"
          />
        </Field>

        {error ? <p className="text-sm text-negative">{error}</p> : null}

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Entrando..." : "Entrar"}
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
        Ainda não tem conta?{" "}
        <Link href="/register" className="text-primary font-medium">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
