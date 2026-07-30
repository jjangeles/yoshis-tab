"use client";

import { useState, useTransition } from "react";
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
  const [pendingStrategy, setPendingStrategy] = useState<MiscCalculationType | null>(null);

  const currentStrategy: MiscCalculationType = item.miscCalcType || "EVEN";

  const handleStrategyChange = (newStrategy: MiscCalculationType) => {
    if (newStrategy === currentStrategy || isPending) return;

    setPendingStrategy(newStrategy);
    startTransition(async () => {
      try {
        await updateMiscCalculationType(item.id, newStrategy, receiptId);
      } finally {
        setPendingStrategy(null);
      }
    });
  };

  const activeParticipantIds = Object.keys(costAssignments).filter(
    (id) => (costAssignments[id] ?? 0) !== 0
  );

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-opacity">
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
      <div className="mt-3.5 flex gap-2 items-center justify-between rounded-xl bg-white p-1.5 border border-slate-200/80 dark:bg-slate-950 dark:border-slate-800">
        <span className="pl-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Split method:
        </span>
        <div className="flex-1 flex gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStrategyChange("EVEN")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
              currentStrategy === "EVEN"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {isPending && pendingStrategy === "EVEN" && <Spinner />}
            Even
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleStrategyChange("PROPORTIONAL")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
              currentStrategy === "PROPORTIONAL"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {isPending && pendingStrategy === "PROPORTIONAL" && <Spinner />}
            Relative
          </button>
        </div>
      </div>

      {/* Breakdown Badges */}
      <div
        className={`mt-3 flex flex-wrap gap-1.5 transition-opacity duration-200 ${
          isPending ? "opacity-50" : "opacity-100"
        }`}
      >
        {activeParticipantIds.length > 0 ? (
          assignedParticipants
            .filter((p) => (costAssignments[p.id] ?? 0) !== 0)
            .map((p) => {
              const cost = costAssignments[p.id];
              const pct = item.total_price !== 0 ? (cost / item.total_price) * 100 : 0;

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

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}