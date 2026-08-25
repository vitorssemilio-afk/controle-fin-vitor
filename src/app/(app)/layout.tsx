import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      {children}
    </div>
  );
}
