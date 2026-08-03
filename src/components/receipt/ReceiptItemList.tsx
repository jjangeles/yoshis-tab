"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import ReceiptItemCard from "./ReceiptItemCard";
import MiscItemCard from "./MiscItemCard";

export interface Participant {
  id: string;
  name: string;
}

export interface ReceiptItemData {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  type: "item" | "misc";
  miscCalcType?: "EVEN" | "PROPORTIONAL";
}

interface ReceiptItemListProps {
  receiptId: string;
  items: ReceiptItemData[];
  assignedParticipants: Participant[];
  assignmentsByItemId: Record<number, Record<string, number>>;
}

export default function ReceiptItemList({
  receiptId,
  items,
  assignedParticipants,
  assignmentsByItemId,
}: ReceiptItemListProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = useState(items);
  const [localAssignmentsByItemId, setLocalAssignmentsByItemId] = useState(assignmentsByItemId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiptItemData | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("0.00");
  const [itemError, setItemError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    setLocalAssignmentsByItemId(assignmentsByItemId);
  }, [assignmentsByItemId]);

  const standardItems = useMemo(
    () => localItems.filter((i) => i.type === "item"),
    [localItems]
  );
  const miscItems = useMemo(
    () =>
      localItems
        .filter((i) => i.type === "misc")
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    [localItems]
  );

  const openCreateModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemQuantity("1");
    setItemUnitPrice("0.00");
    setItemError(null);
    setConfirmDeleteOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ReceiptItemData) => {
    setEditingItem(item);
    setItemName(item.name || "");
    setItemQuantity(String(item.quantity || 1));
    setItemUnitPrice(String((item.unit_price ?? 0).toFixed(2)));
    setItemError(null);
    setConfirmDeleteOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
    setConfirmDeleteOpen(false);
    setItemError(null);
  };

  const submitItem = () => {
    const quantity = Number(itemQuantity || 0);
    const unitPrice = Number(itemUnitPrice || 0);

    if (!itemName.trim()) {
      setItemError("Item name is required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      setItemError("Quantity must be at least 1.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setItemError("Unit price must be zero or greater.");
      return;
    }

    startTransition(async () => {
      setItemError(null);

      const supabase = createBrowserSupabase();
      const nextTotal = Number((quantity * unitPrice).toFixed(2));

      try {
        let savedItem: ReceiptItemData | null = null;

        if (editingItem?.id) {
          const { data: currentAssignments, error: currentAssignmentsError } = await supabase
            .from("item_assignments")
            .select("id, participant_id, share_cost")
            .eq("receipt_item_id", editingItem.id);

          if (currentAssignmentsError) {
            throw new Error(currentAssignmentsError.message);
          }

          const currentAssignmentTotal = (currentAssignments || []).reduce((sum, assignment) => {
            return sum + Number(assignment.share_cost || 0);
          }, 0);

          const { data, error } = await supabase
            .from("receipt_items")
            .update({
              name: itemName.trim(),
              quantity,
              unit_price: unitPrice,
              total_price: nextTotal,
            })
            .eq("id", editingItem.id)
            .select("id, name, quantity, unit_price, total_price, type, misc_calc_type")
            .single();

          if (error) {
            throw new Error(error.message);
          }

          savedItem = data as ReceiptItemData;

          if (currentAssignments && currentAssignments.length > 0 && currentAssignmentTotal > 0) {
            const nextAssignments: Record<string, number> = {};

            await Promise.all(
              currentAssignments.map(async (assignment) => {
                const adjustedShareCost = Number(assignment.share_cost || 0) * (nextTotal / currentAssignmentTotal);
                const roundedShareCost = Number(adjustedShareCost.toFixed(2));

                const { error: assignmentUpdateError } = await supabase
                  .from("item_assignments")
                  .update({
                    share_cost: roundedShareCost,
                  })
                  .eq("id", assignment.id);

                if (assignmentUpdateError) {
                  throw new Error(assignmentUpdateError.message);
                }

                nextAssignments[String(assignment.participant_id)] = roundedShareCost;
              })
            );

            setLocalAssignmentsByItemId((current) => ({
              ...current,
              [editingItem.id]: nextAssignments,
            }));
          }
        } else {
          const { data, error } = await supabase
            .from("receipt_items")
            .insert({
              receipt_id: receiptId,
              name: itemName.trim(),
              quantity,
              unit_price: unitPrice,
              total_price: nextTotal,
              type: "item",
              misc_calc_type: null,
            })
            .select("id, name, quantity, unit_price, total_price, type, misc_calc_type")
            .single();

          if (error) {
            throw new Error(error.message);
          }

          savedItem = data as ReceiptItemData;
        }

        const { data: receiptItems, error: receiptItemsError } = await supabase
          .from("receipt_items")
          .select("total_price")
          .eq("receipt_id", receiptId);

        if (receiptItemsError) {
          throw new Error(receiptItemsError.message);
        }

        const receiptTotal = (receiptItems || []).reduce((sum, item) => {
          return sum + Number(item.total_price || 0);
        }, 0);

        const { error: receiptUpdateError } = await supabase
          .from("receipts")
          .update({
            subtotal: receiptTotal,
            total: receiptTotal,
          })
          .eq("id", receiptId);

        if (receiptUpdateError) {
          throw new Error(receiptUpdateError.message);
        }

        setLocalItems((current) => {
          const currentList = current || [];
          const existingIndex = currentList.findIndex((item) => item.id === savedItem?.id);

          if (existingIndex >= 0) {
            const updated = [...currentList];
            updated[existingIndex] = {
              ...updated[existingIndex],
              name: itemName.trim(),
              quantity,
              unit_price: unitPrice,
              total_price: nextTotal,
              type: updated[existingIndex].type,
              miscCalcType: updated[existingIndex].miscCalcType,
            };
            return updated;
          }

          return [
            {
              id: savedItem?.id ?? Date.now(),
              name: itemName.trim(),
              quantity,
              unit_price: unitPrice,
              total_price: nextTotal,
              type: "item",
              miscCalcType: "EVEN",
            },
            ...currentList,
          ];
        });

        closeModal();
        router.refresh();
      } catch (error) {
        setItemError(
          error instanceof Error ? error.message : "Unable to save item."
        );
      }
    });
  };

  const handleDelete = () => {
    if (!editingItem?.id) return;

    startTransition(async () => {
      const supabase = createBrowserSupabase();

      try {
        const { error: assignmentDeleteError } = await supabase
          .from("item_assignments")
          .delete()
          .eq("receipt_item_id", editingItem.id);

        if (assignmentDeleteError) {
          throw new Error(assignmentDeleteError.message);
        }

        const { error: deleteError } = await supabase
          .from("receipt_items")
          .delete()
          .eq("id", editingItem.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        const { data: receiptItems, error: receiptItemsError } = await supabase
          .from("receipt_items")
          .select("total_price")
          .eq("receipt_id", receiptId);

        if (receiptItemsError) {
          throw new Error(receiptItemsError.message);
        }

        const receiptTotal = (receiptItems || []).reduce((sum, item) => {
          return sum + Number(item.total_price || 0);
        }, 0);

        const { error: receiptUpdateError } = await supabase
          .from("receipts")
          .update({
            subtotal: receiptTotal,
            total: receiptTotal,
          })
          .eq("id", receiptId);

        if (receiptUpdateError) {
          throw new Error(receiptUpdateError.message);
        }

        setLocalItems((current) => current.filter((item) => item.id !== editingItem.id));
        setConfirmDeleteOpen(false);
        closeModal();
        router.refresh();
      } catch (error) {
        setItemError(
          error instanceof Error ? error.message : "Unable to delete item."
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Purchased Items Section */}
      <section className="space-y-3">
        {standardItems.length > 0 ? (
          <div className="grid gap-3">
            {standardItems.map((item) => (
              <ReceiptItemCard
                key={item.id}
                item={item}
                receiptId={receiptId}
                assignedReceiptParticipants={assignedParticipants}
                initialCostAssignments={localAssignmentsByItemId[item.id] || {}}
                onEdit={openEditModal}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
            No items in this receipt.
          </p>
        )}

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Plus size={16} />
          Add Item
        </button>
      </section>

      {/* 2. Miscellaneous Expenses Section */}
      {miscItems.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-md font-semibold text-slate-950 dark:text-slate-50">
                Taxes, Fees & Discounts
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Calculated automatically based on item distribution.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {miscItems.map((miscItem) => (
              <MiscItemCard
                key={miscItem.id}
                item={miscItem}
                receiptId={receiptId}
                assignedParticipants={assignedParticipants}
                costAssignments={localAssignmentsByItemId[miscItem.id] || {}}
              />
            ))}
          </div>
        </section>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => !isPending && closeModal()}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                  {editingItem ? "Edit Item" : "Add Item"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update the line item and its total price.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {itemError && (
              <div className="mt-4 rounded-2xl bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {itemError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100"
                  placeholder="e.g. Latte"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={itemQuantity}
                    onChange={(event) => setItemQuantity(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Unit price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemUnitPrice}
                    onChange={(event) => setItemUnitPrice(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total price</span>
                  <span className="font-semibold text-slate-950 dark:text-slate-50">
                    ₱{(Number(itemQuantity || 0) * Number(itemUnitPrice || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {editingItem && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitItem}
                  disabled={isPending}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {isPending ? "Saving..." : editingItem ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-xl dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                Delete item?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This will remove the item and any participant cost assignments tied to it.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isPending}
                className="w-full rounded-3xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full rounded-3xl bg-red-600 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
