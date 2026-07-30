"use client";

import { useState, useEffect, useTransition } from "react";
import { saveItemAssignments } from "@/app/receipts/actions";

interface Participant {
  id: string;
  name: string;
}

interface ItemAssignmentMap {
  [participantId: string]: number; // participantId -> shares count
}

interface ReceiptItemCardProps {
  item: {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  };
  receiptId: string;
  assignedReceiptParticipants: Participant[];
  initialCostAssignments: Record<string, number>;
}

export default function ReceiptItemCard({
  item,
  receiptId,
  assignedReceiptParticipants,
  initialCostAssignments,
}: ReceiptItemCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sharesMap, setSharesMap] = useState<ItemAssignmentMap>({});
  
  // Local state for immediate card update on screen
  const [localCostAssignments, setLocalCostAssignments] = useState(
    initialCostAssignments
  );
  
  const [isPending, startTransition] = useTransition();

  // Keep local state in sync when server props refresh
  useEffect(() => {
    setLocalCostAssignments(initialCostAssignments);
  }, [initialCostAssignments]);

  const handleOpenModal = () => {
    // Populate modal shares based on current active local costs
    const defaultShares: ItemAssignmentMap = {};
    Object.keys(localCostAssignments).forEach((pId) => {
      if (localCostAssignments[pId] > 0) {
        defaultShares[pId] = 1;
      }
    });
    setSharesMap(defaultShares);
    setIsModalOpen(true);
  };

  const handleSetShares = (participantId: string, shares: number) => {
    const nextShares = Math.max(0, shares);
    setSharesMap((prev) => {
      const updated = { ...prev };
      if (nextShares === 0) {
        delete updated[participantId];
      } else {
        updated[participantId] = nextShares;
      }
      return updated;
    });
  };

  // Immediate calculations from local state
  const activeParticipantIds = Object.keys(localCostAssignments).filter(
    (id) => localCostAssignments[id] > 0
  );
  const isUnassigned = activeParticipantIds.length === 0;

  // Modal calculations for preview
  const modalEntries = Object.entries(sharesMap).filter(([_, s]) => s > 0);
  const modalTotalShares = modalEntries.reduce((sum, [_, s]) => sum + s, 0);

  const handleSave = () => {
    // 1. Calculate new cost breakdown locally
    const newOptimisticAssignments: Record<string, number> = {};
    const payload = modalEntries.map(([pId, shares]) => {
      const percentage = shares / modalTotalShares;
      const shareCost = item.total_price * percentage;
      newOptimisticAssignments[pId] = shareCost;

      return {
        participantId: Number(pId),
        shareCost,
      };
    });

    setLocalCostAssignments(newOptimisticAssignments);
    startTransition(async () => {
      await saveItemAssignments(item.id, payload, receiptId);
      setIsModalOpen(false);
    });
  };

  return (
    <>
      {/* Item Card - Updates Instantly in Background */}
      <div
        onClick={() => !isPending && handleOpenModal()}
        className={`cursor-pointer rounded-[1.5rem] p-4 shadow-sm shadow-slate-900/5 transition border ${
          isUnassigned
            ? "bg-amber-50/90 border-amber-300/70 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:border-amber-700/50 dark:hover:bg-amber-950/50"
            : "bg-white/95 border-transparent hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800/80"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                {item.name || "Unnamed item"}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Qty {item.quantity} • ₱{item.unit_price.toFixed(2)} each
            </p>
          </div>

          <div className="text-right">
            <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
              ₱{item.total_price.toFixed(2)}
            </p>
            <span
              className={`text-[10px] underline ${
                isUnassigned
                  ? "font-medium text-amber-700 dark:text-amber-400"
                  : "text-slate-500"
              }`}
            >
              {!isUnassigned
                && `${activeParticipantIds.length} ${
                    activeParticipantIds.length === 1 ? "person" : "people"
                  } assigned`
              }
            </span>
          </div>
        </div>

        {/* Assigned Badges with Share Amount */}
        {!isUnassigned ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {assignedReceiptParticipants
              .filter((p) => (localCostAssignments[p.id] || 0) > 0)
              .map((p) => {
                const cost = localCostAssignments[p.id];
                const pct = (cost / item.total_price) * 100;
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <span>{p.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">•</span>
                    <span className="font-semibold">{pct.toFixed(0)}%</span>
                    <span className="text-slate-400 dark:text-slate-500">
                      (₱{cost.toFixed(2)})
                    </span>
                  </span>
                );
              })}
          </div>
        ) : (
          <span className="mt-3 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            Unassigned
          </span>
        )}
      </div>

      {/* Share Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                  Assign Shares
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.name} • ₱{item.total_price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Participant List */}
            <div className="py-4 space-y-2.5 max-h-[50vh] overflow-y-auto">
              {assignedReceiptParticipants.length > 0 ? (
                assignedReceiptParticipants.map((p) => {
                  const shares = sharesMap[p.id] || 0;
                  const percentage =
                    modalTotalShares > 0 ? (shares / modalTotalShares) * 100 : 0;
                  const calculatedCost =
                    modalTotalShares > 0
                      ? item.total_price * (shares / modalTotalShares)
                      : 0;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between rounded-xl p-3 border transition ${
                        shares > 0
                          ? "bg-slate-50 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700"
                          : "bg-slate-50/40 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-950 dark:text-slate-50 truncate">
                          {p.name}
                        </p>
                        {shares > 0 && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {percentage.toFixed(0)}% • ₱{calculatedCost.toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Stepper controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetShares(p.id, shares - 1)}
                          disabled={shares === 0 || isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300 disabled:opacity-30 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {shares}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSetShares(p.id, shares + 1)}
                          disabled={isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300 disabled:opacity-30 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs italic text-slate-400">
                  No participants are assigned to this receipt yet.
                </p>
              )}
            </div>

            {/* Real-time Summary Box */}
            <div className="mt-2 rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/50">
              {modalTotalShares > 0 ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span>Total shares allocated:</span>
                    <span>
                      {modalTotalShares} {modalTotalShares === 1 ? "share" : "shares"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Cost per 1 share:</span>
                    <span>
                      ₱{(item.total_price / modalTotalShares).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ No shares assigned. Saving will leave this item unassigned.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {isPending ? (
                  <>
                    <svg
                      className="h-4 w-4 shrink-0 animate-spin text-current"
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
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}