import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/layout/Header";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <Header />

      <main className="mx-auto max-w-3xl px-0 py-3 pb-24 sm:px-0">
        <div className="px-5">{children}</div>
      </main>
</div>
  );
}
