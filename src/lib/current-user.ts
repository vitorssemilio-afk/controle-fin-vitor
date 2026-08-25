import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Usuário não autenticado");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Every server-side data access must go through this, never read
 * a user id from a client-supplied value (body/query/params).
 */
export async function requireCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new UnauthenticatedError();
  }
  return session.user.id;
}
