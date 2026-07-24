import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import ReceiptList from "@/components/receipt/ReceiptList";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 pb-10 pt-4">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Receipts
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              Hello, {user.email?.split("@")[0] || "there"}
            </h1>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Tap a receipt to review details, parse items, and split expenses.
        </p>
      </section>

      {receipts && receipts.length > 0 ? (
        <ReceiptList receipts={receipts} />
      ) : (
        <section className="rounded-[2rem] bg-white/95 p-6 text-center shadow-sm shadow-slate-900/5 dark:bg-slate-900/95">
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">No receipts yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload your first receipt to start splitting and tracking expenses.
          </p>
        </section>
      )}
    </div>
  );
}
