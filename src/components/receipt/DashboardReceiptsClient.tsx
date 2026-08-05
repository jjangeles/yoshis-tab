"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type ReceiptRow = Database["public"]["Tables"]["receipts"]["Row"];
type SortOption = "date_desc" | "date_asc" | "merchant_asc" | "merchant_desc";

type DashboardReceiptsClientProps = {
  userId: string;
  initialReceipts: ReceiptRow[];
  initialParticipantsByReceiptId: Record<string, string[]>;
};

const PAGE_SIZE = 10;
const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date_desc", label: "Receipt date: newest" },
  { value: "date_asc", label: "Receipt date: oldest" },
  { value: "merchant_asc", label: "Merchant name: A → Z" },
  { value: "merchant_desc", label: "Merchant name: Z → A" },
];

function getSortLabel(option: SortOption) {
  return SORT_OPTIONS.find((entry) => entry.value === option)?.label ?? "Receipt date: newest";
}

export default function DashboardReceiptsClient({
  userId,
  initialReceipts,
  initialParticipantsByReceiptId,
}: DashboardReceiptsClientProps) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [receipts, setReceipts] = useState<ReceiptRow[]>(initialReceipts);
  const [participantsByReceiptId, setParticipantsByReceiptId] = useState<Record<string, string[]>>(
    initialParticipantsByReceiptId
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("date_desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialReceipts.length >= PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(initialReceipts.length);

  const fetchParticipantMap = useCallback(
    async (receiptIds: string[]) => {
      if (receiptIds.length === 0) {
        return {} as Record<string, string[]>;
      }

      const { data: receiptParticipants } = await supabase
        .from("receipt_participants")
        .select("receipt_id, participant_id")
        .in("receipt_id", receiptIds);

      if (!receiptParticipants?.length) {
        return {} as Record<string, string[]>;
      }

      const participantIds = Array.from(
        new Set(receiptParticipants.map((entry) => entry.participant_id))
      );

      const { data: participants } = participantIds.length
        ? await supabase
            .from("participants")
            .select("id, name")
            .in("id", participantIds)
            .eq("user_id", userId)
        : { data: [] as { id: number; name: string }[] };

      const participantNameById = new Map(
        (participants || []).map((participant) => [participant.id, participant.name])
      );

      return receiptParticipants.reduce(
        (accumulator, entry) => {
          const participantName = participantNameById.get(entry.participant_id);

          if (participantName) {
            accumulator[entry.receipt_id] = [
              ...(accumulator[entry.receipt_id] ?? []),
              participantName,
            ];
          }

          return accumulator;
        },
        {} as Record<string, string[]>
      );
    },
    [supabase, userId]
  );

  const loadPage = useCallback(
    async (reset = false) => {
      if (reset) {
        setIsLoading(true);
        cursorRef.current = 0;
        setReceipts([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const from = reset ? 0 : cursorRef.current;
        const to = from + PAGE_SIZE - 1;
        const searchValue = searchTerm.trim();

        let query = supabase.from("receipts").select("*").eq("owner_id", userId);

        if (searchValue) {
          query = query.ilike("merchant_name", `%${searchValue}%`);
        }

        switch (sortOption) {
          case "date_asc":
            query = query.order("receipt_date", { ascending: true });
            break;
          case "merchant_asc":
            query = query.order("merchant_name", { ascending: true }).order("receipt_date", {
              ascending: false,
            });
            break;
          case "merchant_desc":
            query = query.order("merchant_name", { ascending: false }).order("receipt_date", {
              ascending: false,
            });
            break;
          case "date_desc":
          default:
            query = query.order("receipt_date", { ascending: false });
            break;
        }

        const { data, error: queryError } = await query.range(from, to);

        if (queryError) {
          throw queryError;
        }

        const nextReceipts = (data ?? []) as ReceiptRow[];
        const nextParticipantMap = await fetchParticipantMap(nextReceipts.map((receipt) => receipt.id));

        setReceipts((currentReceipts) => (reset ? nextReceipts : [...currentReceipts, ...nextReceipts]));
        setParticipantsByReceiptId((currentMapping) =>
          reset ? nextParticipantMap : { ...currentMapping, ...nextParticipantMap }
        );
        cursorRef.current = from + nextReceipts.length;
        setHasMore(nextReceipts.length === PAGE_SIZE);
      } catch (caughtError) {
        console.error(caughtError);
        setError("Unable to load receipts right now. Please try again.");
      } finally {
        if (reset) {
          setIsLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [fetchParticipantMap, searchTerm, sortOption, supabase, userId]
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPage(true);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [loadPage, searchTerm, sortOption]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting && hasMore && !loadingMore && !isLoading) {
          void loadPage(false);
        }
      },
      {
        rootMargin: "180px",
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadPage, loadingMore]);

  const hasSearchValue = searchTerm.trim().length > 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by merchant name"
            className="w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-500"
          />
        </div>

        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            aria-label="Open sort options"
            aria-expanded={showSortMenu}
            onClick={() => setShowSortMenu((currentValue) => !currentValue)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          {showSortMenu ? (
            <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-950">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSortOption(option.value);
                    setShowSortMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    sortOption === option.value
                      ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-slate-50"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <span>{option.label}</span>
                  {sortOption === option.value ? <ChevronDown className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-center px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
        <ArrowUpDown className="h-4 w-4 mr-3" /> {getSortLabel(sortOption)}
      </div>

      {error ? (
        <div className="rounded-[2rem] bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] bg-white/95 p-6 text-center text-sm text-slate-500 dark:bg-slate-900/95 dark:text-slate-400">
          Loading receipts...
        </div>
      ) : receipts.length > 0 ? (
        <div className="space-y-3">
          {receipts.map((receipt) => {
            const receiptParticipants = participantsByReceiptId[receipt.id] ?? [];

            return (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="group flex flex-col rounded-[2rem] bg-white/95 px-4 pb-2 pt-4 text-left shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                      {receipt.merchant_name || "Untitled Receipt"}
                    </p>
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-600">
                      {receipt.receipt_date
                        ? new Date(receipt.receipt_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No date"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base text-xl font-semibold text-slate-950 dark:text-slate-50">
                      ₱ {receipt.total.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  {receiptParticipants.length > 0 ? (
                    <>
                      <span className="rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-600">
                        Participants:
                      </span>
                      <div className="flex text-[10px] font-semibold text-slate-500 dark:text-slate-600">
                        {[...receiptParticipants]
                          .sort((a, b) => a.localeCompare(b))
                          .map((participantName, index, arr) => (
                            <span className="ml-1" key={`${receipt.id}-${participantName}`}>
                              {participantName}
                              {index < arr.length - 1 && ", "}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] italic text-slate-400 dark:text-slate-500">
                      No participants
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          <div ref={sentinelRef} className="h-1" />

          {loadingMore ? (
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              Loading more receipts...
            </div>
          ) : !hasMore ? (
            <div className="text-center px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              You've reached the end of the results.
            </div>
          ) : null}
        </div>
      ) : (
        <section className="rounded-[2rem] bg-white/95 p-6 text-center shadow-sm shadow-slate-900/5 dark:bg-slate-900/95">
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            {hasSearchValue ? "No matching receipts" : "No receipts yet"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {hasSearchValue
              ? "Try a broader merchant name to find a receipt."
              : "Upload your first receipt to start splitting and tracking expenses."}
          </p>
        </section>
      )}
    </section>
  );
}
