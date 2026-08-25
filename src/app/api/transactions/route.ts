import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { transactionFiltersSchema, transactionSchema } from "@/lib/validation";
import {
  createTransactionForUser,
  InvalidTransactionError,
  listTransactionsForUser,
} from "@/lib/transactions";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const { searchParams } = new URL(request.url);

    const filters = transactionFiltersSchema.parse({
      accountId: searchParams.get("accountId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const transactions = await listTransactionsForUser(userId, filters);
    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Filtro inválido" }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const input = transactionSchema.parse(body);
    const transaction = await createTransactionForUser(userId, input);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof InvalidTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
