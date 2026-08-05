import DashboardReceiptsClient from "@/components/receipt/DashboardReceiptsClient";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const PAGE_SIZE = 10;

type ReceiptRow = Database["public"]["Tables"]["receipts"]["Row"];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("owner_id", user.id)
    .order("receipt_date", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    throw error;
  }

  const receiptIds = (receipts ?? []).map((receipt) => receipt.id);

  const { data: receiptParticipants } = receiptIds.length
    ? await supabase
        .from("receipt_participants")
        .select("receipt_id, participant_id")
        .in("receipt_id", receiptIds)
    : { data: [] as { receipt_id: string; participant_id: number }[] };

  const participantIds = Array.from(
    new Set((receiptParticipants ?? []).map((entry) => entry.participant_id))
  );

  const { data: participants } = participantIds.length
    ? await supabase
        .from("participants")
        .select("id, name")
        .in("id", participantIds)
        .eq("user_id", user.id)
    : { data: [] as { id: number; name: string }[] };

  const participantNameById = new Map(
    (participants ?? []).map((participant) => [participant.id, participant.name])
  );

  const participantsByReceiptId = (receiptParticipants ?? []).reduce(
    (accumulator, entry) => {
      const participantName = participantNameById.get(entry.participant_id);

      if (participantName) {
        accumulator[entry.receipt_id] = [
          ...(accumulator[entry.receipt_id] ?? []),
          participantName,
        ];
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
            <h1 className="text-2xl font-semibold">Recent Receipts</h1>
          </div>
        </div>
        <p className="text-xs text-center text-slate-600 dark:text-slate-400">
          Tap a receipt to review details, parse items, and split expenses.
        </p>
      </section>

      <DashboardReceiptsClient
        userId={user.id}
        initialReceipts={(receipts ?? []) as ReceiptRow[]}
        initialParticipantsByReceiptId={participantsByReceiptId}
      />
    </div>
  );
}
