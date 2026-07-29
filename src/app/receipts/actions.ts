"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveItemAssignments(
  receiptItemId: number,
  participantIds: number[],
  receiptId: string
) {
  const supabase = await createServerSupabase();

  const { data: item } = await supabase
    .from("receipt_items")
    .select("total_price")
    .eq("id", receiptItemId)
    .single();

  if (!item) return;

  await supabase
    .from("item_assignments")
    .delete()
    .eq("receipt_item_id", receiptItemId);

  if (participantIds.length > 0) {
    const shareCost = item.total_price / participantIds.length;

    const rowsToInsert = participantIds.map((pId) => ({
      receipt_item_id: receiptItemId,
      participant_id: pId,
      share_cost: shareCost,
    }));

    await supabase.from("item_assignments").insert(rowsToInsert);
  }

  revalidatePath(`/receipts/${receiptId}`);
}