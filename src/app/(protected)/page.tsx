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

  const receiptIds = receipts?.map((receipt) => receipt.id) ?? [];

  const { data: receiptParticipants } = receiptIds.length
    ? await supabase
        .from("receipt_participants")
        .select("receipt_id, participant_id")
        .in("receipt_id", receiptIds)
    : { data: [] as { receipt_id: string; participant_id: number }[] };

  const participantIds = Array.from(
    new Set((receiptParticipants || []).map((entry) => entry.participant_id))
  );

  const { data: participants } = participantIds.length
    ? await supabase
        .from("participants")
        .select("id, name")
        .in("id", participantIds)
        .eq("user_id", user.id)
    : { data: [] as { id: number; name: string }[] };

  const participantNameById = new Map(
    (participants || []).map((participant) => [participant.id, participant.name])
  );

  const participantsByReceiptId = (receiptParticipants || []).reduce(
    (accumulator, entry) => {
      const existing = accumulator[entry.receipt_id] ?? [];
      const participantName = participantNameById.get(entry.participant_id);

      if (participantName) {
        accumulator[entry.receipt_id] = [...existing, participantName];
      }

      return accumulator;
    },
    {} as Record<string, string[]>
  );

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
          {receipts.map((receipt: Database["public"]["Tables"]["receipts"]["Row"]) => {
            const receiptParticipants = participantsByReceiptId[receipt.id] ?? [];

            return (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="group flex flex-col rounded-[2rem] bg-white/95 px-4 pt-4 pb-2 text-left shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
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
                </div>

                <div className="flex items-center justify-center">
                  {receiptParticipants.length > 0 ? (
                    <>
                      <span className="rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-600">
                        Participants:
                      </span>
                      <div className="flex text-[10px] font-semibold text-slate-500 dark:text-slate-600">
                        {[...receiptParticipants]
                          .sort((a, b) => a.localeCompare(b))
                          .map((participantName, index, arr) => (
                            <span className="ml-1" key={`${receipt.id}-${participantName}`}>
                              {participantName}
                              {index < arr.length - 1 && ", "}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] italic text-slate-400 dark:text-slate-500">
                      No participants
                    </div>
                  )}
                </div>
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
