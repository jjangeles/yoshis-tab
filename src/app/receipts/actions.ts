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

async function syncReceiptTotals(receiptId: string) {
  const supabase = await createServerSupabase();

  const { data: items, error } = await supabase
    .from("receipt_items")
    .select("total_price")
    .eq("receipt_id", receiptId);

  if (error) {
    throw new Error(error.message);
  }

  const total = (items || []).reduce((sum, item) => {
    return sum + Number(item.total_price || 0);
  }, 0);

  await supabase
    .from("receipts")
    .update({
      subtotal: total,
      total,
    } as any)
    .eq("id", receiptId);
}

export async function upsertReceiptItem(
  receiptId: string,
  input: {
    id?: number;
    name: string;
    quantity: number;
    unit_price: number;
  }
) {
  const supabase = await createServerSupabase();

  const trimmedName = input.name.trim();
  const quantity = Math.max(1, Math.round(Number(input.quantity) || 0));
  const unitPrice = Math.max(0, Number(input.unit_price) || 0);
  const totalPrice = Number((quantity * unitPrice).toFixed(2));

  if (!trimmedName) {
    throw new Error("Item name is required.");
  }

  let savedItem: {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    type: "item" | "misc";
    misc_calc_type?: "EVEN" | "PROPORTIONAL" | null;
  } | null = null;

  if (input.id) {
    const { data: existingItem, error: existingItemError } = await supabase
      .from("receipt_items")
      .select("type")
      .eq("id", input.id)
      .single();

    if (existingItemError || !existingItem) {
      throw new Error(existingItemError?.message || "Item not found.");
    }

    const { data: currentAssignments, error: currentAssignmentsError } = await supabase
      .from("item_assignments")
      .select("id, share_cost")
      .eq("receipt_item_id", input.id);

    if (currentAssignmentsError) {
      throw new Error(currentAssignmentsError.message);
    }

    const previousTotal = (currentAssignments || []).reduce((sum, assignment) => {
      return sum + Number(assignment.share_cost || 0);
    }, 0);

    const { data: updatedItem, error: updateError } = await supabase
      .from("receipt_items")
      .update({
        name: trimmedName,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      } as any)
      .eq("id", input.id)
      .select("id, name, quantity, unit_price, total_price, type, misc_calc_type")
      .single();

    if (updateError || !updatedItem) {
      throw new Error(updateError?.message || "Unable to update item.");
    }

    savedItem = updatedItem as any;

    if (currentAssignments && currentAssignments.length > 0 && previousTotal > 0) {
      const assignmentUpdatePromises = currentAssignments.map(async (assignment) => {
        const nextShareCost =
          Number(assignment.share_cost || 0) * (totalPrice / previousTotal);

        const { error: assignmentUpdateError } = await supabase
          .from("item_assignments")
          .update({ share_cost: nextShareCost } as any)
          .eq("id", assignment.id);

        if (assignmentUpdateError) {
          throw new Error(assignmentUpdateError.message);
        }
      });

      await Promise.all(assignmentUpdatePromises);
    }
  } else {
    const { data: insertedItem, error: insertError } = await supabase
      .from("receipt_items")
      .insert({
        receipt_id: receiptId,
        name: trimmedName,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        type: "item",
        misc_calc_type: null,
      } as any)
      .select("id, name, quantity, unit_price, total_price, type, misc_calc_type")
      .single();

    if (insertError || !insertedItem) {
      throw new Error(insertError?.message || "Unable to create item.");
    }

    savedItem = insertedItem as any;
  }

  await recomputeMiscItems(receiptId);
  await syncReceiptTotals(receiptId);

  revalidatePath(`/receipts/${receiptId}`);

  return savedItem;
}

export async function deleteReceiptItem(receiptItemId: number, receiptId: string) {
  const supabase = await createServerSupabase();

  const { error: assignmentDeleteError } = await supabase
    .from("item_assignments")
    .delete()
    .eq("receipt_item_id", receiptItemId);

  if (assignmentDeleteError) {
    throw new Error(assignmentDeleteError.message);
  }

  const { error: deleteError } = await supabase
    .from("receipt_items")
    .delete()
    .eq("id", receiptItemId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await recomputeMiscItems(receiptId);
  await syncReceiptTotals(receiptId);

  revalidatePath(`/receipts/${receiptId}`);

  return { id: receiptItemId };
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