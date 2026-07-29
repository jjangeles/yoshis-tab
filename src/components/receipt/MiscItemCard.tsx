"use client";

import { useTransition } from "react";
import { updateMiscCalculationType, MiscCalculationType } from "@/app/receipts/actions";
import { Participant, ReceiptItemData } from "./ReceiptItemList";

interface MiscItemCardProps {
  item: ReceiptItemData;
  receiptId: string;
  assignedParticipants: Participant[];
  costAssignments: Record<string, number>;
}

export default function MiscItemCard({
  item,
  receiptId,
  assignedParticipants,
  costAssignments,
}: MiscItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const currentStrategy: MiscCalculationType = item.miscCalcType || "EVEN";

  const handleStrategyChange = (newStrategy: MiscCalculationType) => {
    if (newStrategy === currentStrategy || isPending) return;
    startTransition(async () => {
      await updateMiscCalculationType(item.id, newStrategy, receiptId);
    });
  };

  const activeParticipantIds = Object.keys(costAssignments).filter(
    (id) => (costAssignments[id] ?? 0) !== 0
  );

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              MISC
            </span>
            <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
              {item.name || "Fee / Discount"}
            </p>
          </div>
        </div>

        <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
          ₱{item.total_price.toFixed(2)}
        </p>
      </div>

      {/* Computation Mode Toggle */}
      <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white p-1.5 border border-slate-200/80 dark:bg-slate-950 dark:border-slate-800">
        <span className="pl-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Split method:
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStrategyChange("EVEN")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              currentStrategy === "EVEN"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Even
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStrategyChange("PROPORTIONAL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              currentStrategy === "PROPORTIONAL"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Proportional
          </button>
        </div>
      </div>

      {/* Breakdown Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {activeParticipantIds.length > 0 ? (
          assignedParticipants
            .filter((p) => (costAssignments[p.id] ?? 0) !== 0)
            .map((p) => {
              const cost = costAssignments[p.id];
              const pct = item.total_price!== 0 ? (cost / item.total_price) * 100 : 0;

              return (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-300"
                >
                  <span>{p.name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-semibold">{pct.toFixed(0)}%</span>
                  <span className="text-slate-400">(₱{cost.toFixed(2)})</span>
                </span>
              );
            })
        ) : (
          <span className="text-[11px] italic text-slate-400">
            No item spending detected yet to compute this fee.
          </span>
        )}
      </div>
    </div>
  );
}
