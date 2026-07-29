"use client";

import { useState, useTransition } from "react";
import { saveItemAssignments } from "@/app/receipts/actions";

interface Participant {
  id: string;
  name: string;
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
  itemAssignments: string[]; // Initially assigned participant IDs (as strings)
}

export default function ReceiptItemCard({
  item,
  receiptId,
  assignedReceiptParticipants,
  itemAssignments,
}: ReceiptItemCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Local state for batch toggling inside the modal
  const [selectedIds, setSelectedIds] = useState<string[]>(itemAssignments);
  const [isPending, startTransition] = useTransition();

  const handleOpenModal = () => {
    // Reset local selection to current server state when opening
    setSelectedIds(itemAssignments);
    setIsModalOpen(true);
  };

  const handleToggle = (participantId: string) => {
    setSelectedIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const numericIds = selectedIds.map(Number);
      await saveItemAssignments(item.id, numericIds, receiptId);
      setIsModalOpen(false);
    });
  };

  const currentCount = itemAssignments.length;
  const isUnassigned = currentCount === 0;
  const perPersonCost = currentCount > 0 ? item.total_price / currentCount : 0;

  return (
    <>
      {/* Item Card (Clickable trigger) */}
      <div
        onClick={handleOpenModal}
        className={`cursor-pointer rounded-[1.5rem] p-4 shadow-sm shadow-slate-900/5 transition border ${
          isUnassigned
            ? "bg-amber-50/90 border-transparent hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
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
              {currentCount > 0 && `${currentCount} assigned (₱${perPersonCost.toFixed(2)} ea)`}
            </span>
          </div>
        </div>

        {/* Assigned Pills Badge */}
        {itemAssignments.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {assignedReceiptParticipants
              .filter((p) => itemAssignments.includes(p.id))
              .map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {p.name}
                </span>
              ))}
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            Unassigned
          </span>
        )}
      </div>

      {/* Assignment Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                  Assign Participants
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.name} • ₱{item.total_price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Participant Toggles */}
            <div className="py-4">
              <p className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                Select participants who shared this item:
              </p>

              {assignedReceiptParticipants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedReceiptParticipants.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggle(p.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                          isSelected
                            ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">
                  No participants are assigned to this receipt yet.
                </p>
              )}

              {/* Calculated preview inside modal */}
              {selectedIds.length > 0 ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                  Split cost:{" "}
                  <strong className="text-slate-950 dark:text-slate-50">
                    ₱{(item.total_price / selectedIds.length).toFixed(2)}
                  </strong>{" "}
                  per person ({selectedIds.length}{" "}
                  {selectedIds.length === 1 ? "person" : "people"})
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  ⚠️ No participants selected. Saving will leave this item unassigned.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {isPending ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}