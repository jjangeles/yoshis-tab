import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import ParticipantTabs from "@/components/receipt/ParticipantTabs";

interface BreakdownPageProps {
  params: Promise<{
    id: string;
  }>;
}

type ReceiptWithRelations = Database["public"]["Tables"]["receipts"]["Row"] & {
  receipt_items: (Database["public"]["Tables"]["receipt_items"]["Row"] & {
    item_assignments: { participant_id: number; share_cost: number }[];
  })[];
  receipt_participants: { participant_id: number }[];
};

export default async function ReceiptBreakdownPage({ params }: BreakdownPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  // 1. Fetch receipt details along with items & assignments
  const { data, error } = (await supabase
    .from("receipts")
    .select(`
      *, 
      receipt_items (
        *,
        item_assignments (participant_id, share_cost)
      ), 
      receipt_participants (participant_id)
    `)
    .eq("id", id)
    .single()) as { data: ReceiptWithRelations | null; error: unknown };

  if (error || !data) {
    return notFound();
  }

  const receipt = data;

  if (receipt.owner_id !== user.id) {
    return notFound();
  }

  // 2. Fetch all participants created by the current user
  const { data: userParticipants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const assignedParticipantIds =
    receipt.receipt_participants?.map((rp) => String(rp.participant_id)) ?? [];

  const formattedUserParticipants =
    userParticipants?.map((p) => ({
      id: String(p.id),
      name: p.name,
    })) ?? [];

  const assignedParticipants = formattedUserParticipants.filter((p) =>
    assignedParticipantIds.includes(p.id)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10 pt-4">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">
            {receipt.merchant_name || "Receipt Breakdown"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Individual share summaries per participant
          </p>
        </div>
        
        <Link
          href={`/receipts/${receipt.id}`}
          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          ← Back to Items
        </Link>
      </div>

      {/* Participant Breakdown Tabs */}
      <ParticipantTabs
        assignedParticipants={assignedParticipants}
        receiptItems={receipt.receipt_items || []}
      />
    </div>
  );
}