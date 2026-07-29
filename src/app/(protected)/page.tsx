import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("owner_id", user.id)
    .order("receipt_date", { ascending: false });

  return (
    <div className="space-y-6 pb-10 pt-4">
      <section className="">
        <div className="text-center items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Recent Receipts
            </h1>
            {/* <h1 className="mt-1 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              Hello, {user.email?.split("@")[0] || "there"}
            </h1> */}
          </div>
        </div>
        <p className="text-xs text-center text-slate-600 dark:text-slate-400">
          Tap a receipt to review details, parse items, and split expenses.
        </p>
      </section>

      {receipts && receipts.length > 0 ? (
        <section className="space-y-3">
          {receipts.map((receipt: Database["public"]["Tables"]["receipts"]["Row"]) => (
            <Link
              key={receipt.id}
              href={`/receipts/${receipt.id}`}
              className="group flex items-center justify-between rounded-[2rem] bg-white/95 px-4 py-5 text-left shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800"
            >
              <div>
                <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                  {receipt.merchant_name || "Untitled Receipt"}
                </p>
                <p className="text-xs leading-6 text-slate-500 dark:text-slate-600">
                  {
                    receipt.receipt_date
                      ? new Date(receipt.receipt_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No date"
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-base text-xl font-semibold text-slate-950 dark:text-slate-50">
                  ₱ {receipt.total.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </Link>
          ))}
        </section>
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
