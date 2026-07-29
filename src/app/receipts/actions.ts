"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TablesInsert } from "@/types/database";

export interface ParticipantCostInput {
  participantId: number;
  shareCost: number;
}

export type MiscCalculationType = "EVEN" | "PROPORTIONAL";

/**
 * Recalculates and syncs assignments for all "misc" type items on a receipt
 * based on the latest assignments of standard "item" type items.
 */
export async function recomputeMiscItems(receiptId: string) {
  const supabase = await createServerSupabase();

  // 1. Fetch all receipt items for this receipt
  const { data: receiptItems, error: itemsError } = await supabase
    .from("receipt_items")
    .select("id, type, total_price, misc_calc_type")
    .eq("receipt_id", receiptId);

  if (itemsError || !receiptItems || receiptItems.length === 0) return;

  const typeItems = receiptItems.filter((i) => i.type === "item");
  const miscItems = receiptItems.filter((i) => i.type === "misc");

  if (miscItems.length === 0) return;

  const typeItemIds = typeItems.map((i) => i.id);

  // 2. Fetch current assignments for standard items
  const itemAssignmentsMap: Record<number, number> = {};
  let grandTotalItemSpent = 0;

  if (typeItemIds.length > 0) {
    const { data: itemAssignments } = await supabase
      .from("item_assignments")
      .select("participant_id, share_cost")
      .in("receipt_item_id", typeItemIds);

    if (itemAssignments) {
      itemAssignments.forEach((a) => {
        const pId = a.participant_id;
        const cost = Number(a.share_cost) || 0;
        itemAssignmentsMap[pId] = (itemAssignmentsMap[pId] || 0) + cost;
        grandTotalItemSpent += cost;
      });
    }
  }

  // 3. Process each misc item
  for (const misc of miscItems) {
    const strategy: MiscCalculationType =
      (misc.misc_calc_type as MiscCalculationType) || "EVEN";
    const totalPrice = Number(misc.total_price) || 0;

    // Remove existing assignments for this misc item
    await supabase
      .from("item_assignments")
      .delete()
      .eq("receipt_item_id", misc.id);

    const rowsToInsert: TablesInsert<"item_assignments">[] = [];

    if (strategy === "EVEN") {
      // Split evenly among participants who have standard item assignments
      const activeParticipantIds = Object.keys(itemAssignmentsMap).map(Number);

      if (activeParticipantIds.length > 0) {
        const splitCost = totalPrice / activeParticipantIds.length;
        activeParticipantIds.forEach((pId) => {
          rowsToInsert.push({
            receipt_item_id: misc.id,
            participant_id: pId,
            share_cost: splitCost,
          });
        });
      }
    } else if (strategy === "PROPORTIONAL") {
      // Split proportional to individual standard item spending
      if (grandTotalItemSpent > 0) {
        Object.entries(itemAssignmentsMap).forEach(([pIdStr, spentAmount]) => {
          const pId = Number(pIdStr);
          if (spentAmount > 0) {
            const ratio = spentAmount / grandTotalItemSpent;
            rowsToInsert.push({
              receipt_item_id: misc.id,
              participant_id: pId,
              share_cost: totalPrice * ratio,
            });
          }
        });
      }
    }

    if (rowsToInsert.length > 0) {
      await supabase.from("item_assignments").insert(rowsToInsert as any);
    }
  }
}

/**
 * Saves assignments for a specific item and automatically recomputes misc items.
 */
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
    const rowsToInsert: TablesInsert<"item_assignments">[] =
      validAssignments.map((a) => ({
        receipt_item_id: receiptItemId,
        participant_id: a.participantId,
        share_cost: a.shareCost,
      }));

    await supabase.from("item_assignments").insert(rowsToInsert as any);
  }

  await recomputeMiscItems(receiptId);

  revalidatePath(`/receipts/${receiptId}`);
}

/**
 * Updates the computation strategy for a misc item and recomputes assignments.
 */
export async function updateMiscCalculationType(
  miscItemId: number,
  calcType: MiscCalculationType,
  receiptId: string
) {
  const supabase = await createServerSupabase();

  await supabase
    .from("receipt_items")
    .update({ misc_calc_type: calcType } as any)
    .eq("id", miscItemId);

  await recomputeMiscItems(receiptId);

  revalidatePath(`/receipts/${receiptId}`);
}