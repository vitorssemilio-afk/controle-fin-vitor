import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createSavingsGoalSchema } from "@/lib/validation";
import { createSavingsGoalForUser, InvalidSavingsGoalError } from "@/lib/savings-goals";
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

    const input = createSavingsGoalSchema.parse(body);
    const goal = await createSavingsGoalForUser(userId, input);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof InvalidSavingsGoalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
