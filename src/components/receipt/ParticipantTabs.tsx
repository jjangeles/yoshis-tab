"use client";

import { useState } from "react";
import {
  ParticipantShare,
  exportSingleParticipantImage,
  exportAllParticipantsSummaryImage,
} from "@/lib/receiptExporter";
import { Download } from "lucide-react";

interface ParticipantTabsProps {
  merchantName?: string | null;
  receiptDate?: string | null;
  assignedParticipants: { id: string; name: string }[];
  receiptItems: {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    type?: string | null;
    item_assignments?: { participant_id: number; share_cost: number }[];
  }[];
}

export default function ParticipantTabs({
  merchantName,
  receiptDate,
  assignedParticipants,
  receiptItems,
}: ParticipantTabsProps) {
  const [activeTabId, setActiveTabId] = useState<string>(
    assignedParticipants[0]?.id || ""
  );
  const [isGenerating, setIsGenerating] = useState(false);

  if (assignedParticipants.length === 0) {
    return (
      <div className="rounded-[1.5rem] bg-slate-100 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        No participants assigned to calculate share costs.
      </div>
    );
  }

  // Calculate share details for each participant
  const participantShares: Record<string, ParticipantShare> = {};

  assignedParticipants.forEach((p) => {
    participantShares[p.id] = {
      participantId: p.id,
      participantName: p.name,
      items: [],
      totalShareCost: 0,
    };
  });

  receiptItems.forEach((item) => {
    item.item_assignments?.forEach((ia) => {
      const pId = String(ia.participant_id);
      if (participantShares[pId]) {
        const shareCost = Number(ia.share_cost) || 0;
        participantShares[pId].items.push({
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          shareCost,
          type: (item.type as "item" | "misc") || "item",
        });
        participantShares[pId].totalShareCost += shareCost;
      }
    });
  });

  const activeParticipant = participantShares[activeTabId];

  // Action Handlers
  const handleDownloadSingleImage = () => {
    if (!activeParticipant) return;

    setIsGenerating(true);

    try {
      exportSingleParticipantImage(activeParticipant, {
        merchantName,
        receiptDate,
      });
    } catch (err) {
      console.error("Failed to generate image:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAllSummary = () => {
    setIsGenerating(true);

    try {
      exportAllParticipantsSummaryImage(
        Object.values(participantShares),
        {
          merchantName,
          receiptDate,
        }
      );
    } catch (err) {
      console.error("Failed to generate summary image:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-[2rem] bg-white/95 p-5 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-md font-semibold text-slate-950 dark:text-slate-50">
            Participant Breakdowns
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            View individual cost breakdown per participant.
          </p>
        </div>

        {/* Global Download All Button */}
        <button
          type="button"
          onClick={handleDownloadAllSummary}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <Download />
        </button>
      </div>

      {/* Scrollable Tab Headers */}
      <div className="no-scrollbar flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {assignedParticipants.map((p) => {
          const isActive = p.id === activeTabId;
          const share = participantShares[p.id];
          return (
            <button
              key={p.id}
              onClick={() => setActiveTabId(p.id)}
              className={`min-w-[6rem] shrink-0 items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <p>{p.name}</p>
              <p className="text-[10px]">
                ₱
                {share?.totalShareCost.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      {activeParticipant && (
        <div className="mt-4 space-y-3">
          {activeParticipant.items.length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeParticipant.items.map((item) => {
                const percentageShare =
                  item.totalPrice && item.totalPrice !== 0
                    ? Math.abs((item.shareCost / item.totalPrice) * 100)
                    : 0;

                return (
                  <li
                    key={item.itemId}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.itemName}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.type === "misc" && (
                          <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Misc
                          </span>
                        )}
                        {item.type === "misc" ? (
                          <>
                            {percentageShare.toLocaleString("en-PH", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                            % of ₱
                            {item.totalPrice.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </>
                        ) : (
                          <>
                            {item.quantity} x ₱
                            {item.unitPrice.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        ₱
                        {item.shareCost.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs italic text-slate-400 dark:text-slate-500">
              No items assigned to {activeParticipant.participantName} yet.
            </p>
          )}

          {/* Bottom Card Summary & Download Button */}
          <div className="flex items-center justify-between gap-5 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-2xl font-semibold">
              Total
            </p>

            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {activeParticipant.participantName}'s Total
              </span>
              <span className="text-lg font-bold text-slate-950 dark:text-slate-50">
                ₱
                {activeParticipant.totalShareCost.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
