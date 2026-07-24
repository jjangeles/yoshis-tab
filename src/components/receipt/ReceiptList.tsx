"use client";

import Link from "next/link";
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";

import "react-swipeable-list/dist/styles.css";

import type { Database } from "@/types/database";

type Props = {
  receipts: Database["public"]["Tables"]["receipts"]["Row"][];
};

export default function ReceiptList({ receipts }: Props) {
  return (
    <SwipeableList className="space-y-3">
      {receipts.map((receipt) => (
        <SwipeableListItem
          key={receipt.id}
          trailingActions={
            <TrailingActions>
              <SwipeAction
                onClick={() => {
                  console.log("delete", receipt.id);
                }}
              >
                <div className="flex h-full items-center justify-center bg-red-600 px-6 text-white">
                  Delete
                </div>
              </SwipeAction>
            </TrailingActions>
          }
        >
          <Link
            href={`/receipts/${receipt.id}`}
            className="group flex w-full items-center justify-between rounded-[2rem] bg-white/95 px-4 py-5 text-left shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:bg-slate-900/95 dark:hover:bg-slate-800"
          >
            <div>
              <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                {receipt.merchant_name || "Untitled Receipt"}
              </p>

              <p className="text-xs leading-6 text-slate-500">
                {receipt.receipt_date
                  ? new Date(receipt.receipt_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                  : "No date"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                ₱{" "}
                {receipt.total.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </Link>
        </SwipeableListItem>
      ))}
    </SwipeableList>
  );
}
