import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/layout/Header";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <Header />

      <main className="mx-auto min-h-screen max-w-3xl bg-slate-50 px-0 py-3 pb-28 md:pt-16 md:pb-0 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-0">
        <div className="px-5">{children}</div>
      </main>
    </>
  );
}