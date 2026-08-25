import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAccountsForUser } from "@/lib/accounts";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const accounts = await listAccountsForUser(session.user.id);
  redirect(accounts.length === 0 ? "/onboarding" : "/dashboard");
}
