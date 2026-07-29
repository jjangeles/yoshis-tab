"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ParticipantCostInput {
  participantId: number;
  shareCost: number;
}

export async function saveItemAssignments(
  receiptItemId: number,
  assignments: ParticipantCostInput[],
  receiptId: string
) {
  const supabase = await createServerSupabase();

  // 1. Clear previous assignments for this item
  await supabase
    .from("item_assignments")
    .delete()
    .eq("receipt_item_id", receiptItemId);

  // 2. Insert new calculated cost allocations
  const validAssignments = assignments.filter((a) => a.shareCost > 0);

  if (validAssignments.length > 0) {
    const rowsToInsert = validAssignments.map((a) => ({
      receipt_item_id: receiptItemId,
      participant_id: a.participantId,
      share_cost: a.shareCost,
    }));

    await supabase.from("item_assignments").insert(rowsToInsert);
  }

  revalidatePath(`/receipts/${receiptId}`);
}