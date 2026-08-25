import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { upsertBudgetSchema } from "@/lib/validation";
import { InvalidBudgetError, upsertBudgetForUser } from "@/lib/budgets";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const input = upsertBudgetSchema.parse(body);
    const budget = await upsertBudgetForUser(userId, input);
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof InvalidBudgetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
