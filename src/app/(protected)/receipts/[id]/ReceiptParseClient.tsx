"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ParsedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReceiptParseClientProps {
  receiptId: string;
}

export default function ReceiptParseClient({ receiptId }: ReceiptParseClientProps) {
  const router = useRouter();
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);

  const handleParse = async () => {
    setParseError(null);
    setParsing(true);

    const response = await fetch(`/api/receipts/${receiptId}/parse`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setParseError(body?.error || "Failed to parse receipt.");
      setParsing(false);
      return;
    }

    const body = await response.json().catch(() => null);

    if (!body?.success) {
      setParseError(body?.error || "Failed to parse receipt.");
      setParsing(false);
      return;
    }

    if (Array.isArray(body.items)) {
      setItems(body.items);
    }

    setParsing(false);
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3 rounded-[2rem] bg-white/95 px-4 py-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
        <div>
          <p className="text-base font-semibold text-slate-950 dark:text-slate-50">Parse receipt</p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">Extract items from the receipt image.</p>
        </div>
        <button
          type="button"
          disabled={parsing}
          onClick={handleParse}
          className="inline-flex h-12 items-center justify-center rounded-3xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {parsing ? "Parsing..." : "Parse"}
        </button>
      </div>

      {parseError ? (
        <div className="rounded-3xl bg-red-50 px-4 py-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {parseError}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-[1.8rem] bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{item.name}</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Qty {item.quantity} • {item.unit_price.toFixed(2)} each
                  </p>
                </div>
                <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{item.total_price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
