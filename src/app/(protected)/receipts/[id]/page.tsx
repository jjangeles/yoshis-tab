import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import ReceiptImageViewer from "@/components/receipt/ReceiptImageViewer";
import ReceiptEditModal from "@/components/receipt/ReceiptEditModal";
import ReceiptItemCard from "@/components/receipt/ReceiptItemCard";

interface ReceiptPageProps {
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

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  // 1. Fetch receipt details along with items, item_assignments, and assigned participants
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

  // 3. Format participants & IDs as strings for UI compatibility
  const assignedParticipantIds =
    receipt.receipt_participants?.map((rp) => String(rp.participant_id)) ?? [];

  const formattedUserParticipants =
    userParticipants?.map((p) => ({
      id: String(p.id),
      name: p.name,
    })) ?? [];

  // 4. Filter down to assigned participant objects for display
  const assignedParticipants = formattedUserParticipants.filter((p) =>
    assignedParticipantIds.includes(p.id)
  );

  let imageUrl = null;
  if (receipt.image_url) {
    const { data: imageData } = await supabase.storage
      .from("receipt-images")
      .createSignedUrl(receipt.image_url, 60 * 60);

    imageUrl = imageData?.signedUrl;
  }

  return (
    <div className="space-y-6 pb-10 pt-4">
      <section className="space-y-4">
        <div className="rounded-[2rem] bg-white/95 px-5 py-5 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
          <div className="relative flex flex-col gap-3">
            
            {/* Merchant & Date Header */}
            <div className="text-center">
              <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                {receipt.merchant_name || "Untitled Receipt"}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {receipt.receipt_date
                  ? new Date(receipt.receipt_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Date Unavailable"}
              </p>
            </div>

            {/* Receipt Action Menu / Edit Modal */}
            <ReceiptEditModal
              receipt={{
                id: receipt.id,
                merchant_name: receipt.merchant_name,
                receipt_date: receipt.receipt_date,
                subtotal: receipt.subtotal,
                tax: receipt.tax,
                service_charge: receipt.service_charge,
                total: receipt.total,
              }}
              allParticipants={formattedUserParticipants}
              initialParticipantIds={assignedParticipantIds}
            />

            {/* Assigned Participants Section (Above Total) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {assignedParticipants.length > 0 ? (
                  assignedParticipants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border-slate-200/80 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    >
                      {p.name}
                    </span>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    No participants added yet
                  </p>
                )}
              </div>
            </div>

            {/* Total Display */}
            <div className="mt-1 rounded-[1rem] bg-slate-950 p-2 text-center text-white dark:bg-slate-50 dark:text-slate-950">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-500">
                Total
              </p>
              <p className="mt-1 text-3xl font-semibold">
                ₱{" "}
                {receipt.total.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

          </div>
        </div>

        {/* Receipt Items Section */}
        <div className="rounded-[2rem] px-2 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-md font-semibold text-slate-950 dark:text-slate-50">
                Receipt items
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Tap an item to assign participants.
              </p>
            </div>
            {receipt.image_url && <ReceiptImageViewer imageUrl={imageUrl} />}
          </div>

          {Array.isArray(receipt.receipt_items) &&
          receipt.receipt_items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {receipt.receipt_items.map((item) => {
                const initialCostAssignments: Record<string, number> = {};

                item.item_assignments?.forEach((ia) => {
                  if (ia.participant_id) {
                    initialCostAssignments[String(ia.participant_id)] = ia.share_cost;
                  }
                });

                return (
                  <ReceiptItemCard
                    key={item.id}
                    item={item}
                    receiptId={receipt.id}
                    assignedReceiptParticipants={assignedParticipants}
                    initialCostAssignments={initialCostAssignments}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] bg-slate-100 px-4 py-5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              No receipt items were returned for this receipt.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}