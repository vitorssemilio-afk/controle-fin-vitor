import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAccountSchema } from "@/lib/validation";
import { createAccountForUser, listAccountsForUser } from "@/lib/accounts";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const accounts = await listAccountsForUser(userId);
    return NextResponse.json(accounts);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
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

    const input = createAccountSchema.parse(body);
    const account = await createAccountForUser(userId, input);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    throw error;
  }
}
