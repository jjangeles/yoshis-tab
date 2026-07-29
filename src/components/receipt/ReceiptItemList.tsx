"use client";

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
  const standardItems = items.filter((i) => i.type === "item");
  const miscItems = items
    .filter((i) => i.type === "misc")
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

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
                initialCostAssignments={assignmentsByItemId[item.id] || {}}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
            No items in this receipt.
          </p>
        )}
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
                costAssignments={assignmentsByItemId[miscItem.id] || {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
