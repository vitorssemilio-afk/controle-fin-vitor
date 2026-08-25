"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Contas" },
  { href: "/transactions", label: "Transações" },
  { href: "/categories", label: "Categorias" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3">
        <div className="flex gap-4">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium ${isActive ? "text-primary" : "text-ink-soft hover:text-ink"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-ink-soft hover:text-ink"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
