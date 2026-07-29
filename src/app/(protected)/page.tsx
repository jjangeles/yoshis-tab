import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  // Fetch receipts along with their joined participants using the relationship table
  const { data: receipts, error } = await supabase
    .from("receipts")
    .select(`
      *,
      receipt_participants (
        participants (
          id,
          name
        )
      )
    `)
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
          </div>
        </div>
        <p className="text-xs text-center text-slate-600 dark:text-slate-400">
          Tap a receipt to review details, parse items, and split expenses.
        </p>
      </section>

      {receipts && receipts.length > 0 ? (
        <section className="space-y-3">
          {receipts.map((receipt: any) => {
            // Extract participants array safely from the joined query result
            const assignedParticipants =
              receipt.receipt_participants
                ?.map((rp: any) => rp.participants)
                .filter(Boolean) || [];

            return (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="group flex flex-wrap items-center justify-between rounded-[2rem] bg-white/95 px-5 py-5 text-left shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800"
              >
                <div className="space-y-2">
                  <div>
                    <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                      {receipt.merchant_name || "Untitled Receipt"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {receipt.receipt_date
                        ? new Date(receipt.receipt_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No date"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                    ₱ {receipt.total.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {/* Participants Pills (Placed Below Date) */}
                {assignedParticipants.length > 0 && (
                  <div className="w-full flex flex-wrap justify-center items-center gap-1">
                    {assignedParticipants.map((p: { id: string | number; name: string }) => (
                      <span
                        key={p.id}
                        className="rounded-full border-slate-200/60 bg-slate-100/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
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