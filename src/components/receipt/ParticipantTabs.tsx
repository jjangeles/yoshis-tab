"use client";

import { useState } from "react";
import {
  ParticipantShare,
  exportAllParticipantsSummaryImage,
} from "@/lib/receiptExporter";
import { Download, AlertTriangle } from "lucide-react";
import Fraction from "fraction.js";

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
    misc_calc_type: string | null;
    item_assignments?: {
      participant_id: number;
      share_cost: number;
    }[];
  }[];
}

export default function ParticipantTabs({
  merchantName,
  receiptDate,
  assignedParticipants,
  receiptItems,
}: ParticipantTabsProps) {
  const [activeTabId, setActiveTabId] = useState("all");

  const [isGenerating, setIsGenerating] = useState(false);

  if (assignedParticipants.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No participants assigned to calculate share costs.
      </p>
    );
  }

  // Calculate unassigned items count
  const unassignedCount = receiptItems.filter(
    (item) =>
      !item.item_assignments ||
      item.item_assignments.length === 0
  ).length;

  const hasUnassignedItems = unassignedCount > 0;

  // Calculate share details for each participant
  const participantShares: Record<
    string,
    ParticipantShare
  > = {};

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
        const shareCost =
          Number(ia.share_cost) || 0;

        participantShares[pId].items.push({
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          shareCost,
          misc_calc_type:
            item.misc_calc_type,
          type:
            (item.type as "item" | "misc") ||
            "item",
        });

        participantShares[pId].totalShareCost +=
          shareCost;
      }
    });
  });

  const shares = Object.values(
    participantShares
  );

  const activeParticipant =
    activeTabId === "all"
      ? null
      : participantShares[activeTabId];

  const grandTotal = shares.reduce(
    (total, participant) =>
      total + participant.totalShareCost,
    0
  );

  const handleDownloadAllSummary =
    async () => {
      if (
        isGenerating ||
        hasUnassignedItems
      ) {
        return;
      }

      setIsGenerating(true);

      try {
        await exportAllParticipantsSummaryImage(
          shares,
          {
            merchantName,
            receiptDate,
          }
        );
      } catch (err) {
        console.error(
          "Failed to generate summary image:",
          err
        );
      } finally {
        setIsGenerating(false);
      }
    };

  const getFraction = (
    shareCost: number,
    totalCost: number
  ) => {
    if (totalCost <= 0) {
      return "0";
    }

    return new Fraction(
      shareCost / totalCost
    ).toFraction();
  };

  return (
    <div className="space-y-4 rounded-[2rem] bg-white/95 p-5 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95">
      {/* Amber Warning for Unassigned Items */}
      {hasUnassignedItems && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              There{" "}
              {unassignedCount > 1
                ? "are"
                : "is"}{" "}
              {unassignedCount} unassigned
              item
              {unassignedCount > 1
                ? "s"
                : ""}.
              Please assign all items first.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="shrink-0 rounded-full bg-amber-200/70 px-3 py-1 text-xs font-semibold text-amber-950 transition hover:bg-amber-300 dark:bg-amber-800/60 dark:text-amber-100 dark:hover:bg-amber-700/80"
          >
            Assign
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-md font-semibold text-slate-950 dark:text-slate-50">
            Participant Breakdowns
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            View participant share
          </p>
        </div>

        {/* Global Download All Button */}
        <button
          type="button"
          onClick={handleDownloadAllSummary}
          disabled={
            isGenerating ||
            hasUnassignedItems
          }
          title={
            hasUnassignedItems
              ? "Assign all items to enable download"
              : "Download Summary Image"
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <span className="text-xs">
            Download
          </span>

          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {/* All / Summary Tab */}
        <button
          type="button"
          onClick={() =>
            setActiveTabId("all")
          }
          className={`min-w-[5rem] shrink-0 rounded-md px-1 py-1.5 text-xs font-semibold transition-all ${
            activeTabId === "all"
              ? "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-950"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <p className="font-semibold">
            All
          </p>

          <p className="text-[10px]">
            ₱
            {grandTotal.toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>
        </button>

        {/* Participant Tabs */}
        {assignedParticipants.map(
          (p) => {
            const isActive =
              p.id === activeTabId;

            const share =
              participantShares[p.id];

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveTabId(p.id)}
                className={`w-[5rem] max-w-[5rem] shrink-0 rounded-md px-1 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-950 text-white dark:bg-slate-50 dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <p className="truncate whitespace-nowrap">
                  {p.name}
                </p>

                <p className="text-[10px]">
                  ₱
                  {share?.totalShareCost.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </button>
            );
          }
        )}
      </div>

      {/* All Participants Tab */}
      {activeTabId === "all" && (
        <div className="mt-4 space-y-6">
          {shares.map((participant) => (
            <div
              key={participant.participantId}
              className="space-y-3 border p-2 px-4 rounded-xl bg-slate-300/5 border-slate-200/30 dark:border-slate-800 shadow-xs dark:shadow-slate-950/20"
            >
              {/* Participant Header */}
              <div className="flex items-center justify-center">
                <h3 className="text-2xl font-extrabold text-slate-950 dark:text-slate-50">
                  {participant.participantName}
                </h3>
              </div>

              {/* Participant Items */}
              {participant.items.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {participant.items.map((item) => {
                    const percentageShare =
                      item.totalPrice &&
                      item.totalPrice !== 0
                        ? Math.abs(
                            (item.shareCost /
                              item.totalPrice) *
                              100
                          )
                        : 0;

                    return (
                      <li
                        key={`${participant.participantId}-${item.itemId}`}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {item.itemName}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.type === "misc" && (
                              <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-950/60 dark:text-green-300">
                                {item.misc_calc_type === "EVEN"
                                  ? "EVEN"
                                  : "RELATIVE"}
                              </span>
                            )}

                            {item.type === "misc" ? (
                              <>
                                {percentageShare.toLocaleString(
                                  "en-PH",
                                  {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                                % of ₱
                                {item.totalPrice.toLocaleString(
                                  "en-PH",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </>
                            ) : (
                              <>
                                {getFraction(
                                  item.shareCost,
                                  item.unitPrice
                                )}{" "}
                                x ₱
                                {item.unitPrice.toLocaleString(
                                  "en-PH",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </>
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            ₱
                            {item.shareCost.toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-3 text-center text-xs italic text-slate-400 dark:text-slate-500">
                  No items assigned to{" "}
                  {participant.participantName} yet.
                </p>
              )}

              {/* Participant Total */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {participant.participantName}'s Total
                </p>

                <p className="text-lg font-bold text-slate-950 dark:text-slate-50">
                  ₱
                  {participant.totalShareCost.toLocaleString(
                    "en-PH",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="px-4 flex items-center justify-between border-slate-300 pt-4 dark:border-slate-700">
            <p className="text-xl font-semibold text-slate-950 dark:text-slate-50">
              Total
            </p>

            <p className="text-2xl font-bold text-slate-950 dark:text-slate-50">
              ₱
              {grandTotal.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Active Participant Panel */}
      {activeParticipant && (
        <div className="mt-4 space-y-3">
          {activeParticipant.items
            .length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeParticipant.items.map(
                (item) => {
                  const percentageShare =
                    item.totalPrice &&
                    item.totalPrice !== 0
                      ? Math.abs(
                          (item.shareCost /
                            item.totalPrice) *
                            100
                        )
                      : 0;

                  return (
                    <li
                      key={item.itemId}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.itemName}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.type ===
                            "misc" && (
                            <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-950/60 dark:text-green-300">
                              {item.misc_calc_type ===
                              "EVEN"
                                ? "EVEN"
                                : "RELATIVE"}
                            </span>
                          )}

                          {item.type ===
                          "misc" ? (
                            <>
                              {percentageShare.toLocaleString(
                                "en-PH",
                                {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                }
                              )}
                              % of ₱
                              {item.totalPrice.toLocaleString(
                                "en-PH",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </>
                          ) : (
                            <>
                              {getFraction(
                                item.shareCost,
                                item.unitPrice
                              )}{" "}
                              x ₱
                              {item.unitPrice.toLocaleString(
                                "en-PH",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ₱
                          {item.shareCost.toLocaleString(
                            "en-PH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </p>
                      </div>
                    </li>
                  );
                }
              )}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs italic text-slate-400 dark:text-slate-500">
              No items assigned to{" "}
              {
                activeParticipant.participantName
              }{" "}
              yet.
            </p>
          )}

          {/* Bottom Card Summary */}
          <div className="flex items-center justify-between gap-5 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="text-2xl font-semibold">
              Total
            </p>

            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {
                  activeParticipant.participantName
                }
                's Total
              </span>

              <span className="text-lg font-bold text-slate-950 dark:text-slate-50">
                ₱
                {activeParticipant.totalShareCost.toLocaleString(
                  "en-PH",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
