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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={parsing}
          onClick={handleParse}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {parsing ? "Parsing receipt..." : "Parse Receipt"}
        </button>
      </div>

      {parseError ? (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{parseError}</div>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Parsed items</h2>
          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex justify-between gap-4 text-sm text-slate-700">
                  <span>{item.name}</span>
                  <span>{item.quantity} × {item.unit_price.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-base font-semibold text-slate-950">{item.total_price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
