import { requireCurrentUserId } from "@/lib/current-user";
import { listCategoriesForUser } from "@/lib/categories";
import { CategoriesManager } from "@/components/categories-manager";

export default async function CategoriesPage() {
  const userId = await requireCurrentUserId();
  const categories = await listCategoriesForUser(userId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Categorias</h1>
      <div className="mt-6">
        <CategoriesManager categories={categories} />
      </div>
    </main>
  );
}
