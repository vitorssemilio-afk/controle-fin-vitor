import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCategorySchema } from "@/lib/validation";
import { createCategoryForUser, listCategoriesForUser } from "@/lib/categories";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const categories = await listCategoriesForUser(userId);
    return NextResponse.json(categories);
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

    const input = createCategorySchema.parse(body);
    const category = await createCategoryForUser(userId, input);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Você já tem uma categoria com esse nome" }, { status: 409 });
    }
    throw error;
  }
}
