"use client";

import { useEffect, useState, useRef } from "react";
import { X, Ellipsis, Pencil, Printer, Trash2, AlertTriangle, Check, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface Participant {
  id: string;
  name: string;
}

interface ReceiptEditModalProps {
  receipt: {
    id: string;
    merchant_name: string | null;
    receipt_date: string | null;
    subtotal: number | null;
    tax: number | null;
    service_charge: number | null;
    total: number;
  };
  allParticipants?: Participant[];
  initialParticipantIds?: string[];
}

export default function ReceiptEditModal({
  receipt,
  allParticipants = [],
  initialParticipantIds = [],
}: ReceiptEditModalProps) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const [merchantName, setMerchantName] = useState(receipt.merchant_name ?? "");
  const [receiptDate, setReceiptDate] = useState(
    receipt.receipt_date?.split("T")[0] ?? ""
  );
  const [total, setTotal] = useState(receipt.total.toString());
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    initialParticipantIds
  );

  // Close dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Sync state when incoming props change
  useEffect(() => {
    setMerchantName(receipt.merchant_name ?? "");
    setReceiptDate(receipt.receipt_date?.split("T")[0] ?? "");
    setTotal(receipt.total.toString());
    setSelectedParticipantIds(initialParticipantIds);
  }, [receipt, initialParticipantIds]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = modalOpen || deleteConfirmOpen;
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, deleteConfirmOpen]);

  const handlePrint = () => {
    setMenuOpen(false);
    window.print();
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  async function handleDeleteConfirm() {
    setDeleting(true);
    setError(null);

    const supabase = createBrowserSupabase();

    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receipt.id);

    if (error) {
      setDeleting(false);
      setError(error.message);
      return;
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    router.push(`/`);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const supabase = createBrowserSupabase();

    // 1. Update receipt main details
    const { error: updateError } = await supabase
      .from("receipts")
      .update({
        merchant_name: merchantName.trim() || null,
        receipt_date: receiptDate || null,
        total: Number(total) || 0,
      })
      .eq("id", receipt.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // 2. Sync receipt_participants relations
    const { error: deleteRelError } = await supabase
      .from("receipt_participants")
      .delete()
      .eq("receipt_id", receipt.id);

    if (deleteRelError) {
      setSaving(false);
      setError(deleteRelError.message);
      return;
    }

    if (selectedParticipantIds.length > 0) {
      const inserts = selectedParticipantIds.map((pId) => ({
        receipt_id: receipt.id,
        participant_id: pId,
      }));

      const { error: insertRelError } = await supabase
        .from("receipt_participants")
        .insert(inserts as any);

      if (insertRelError) {
        setSaving(false);
        setError(insertRelError.message);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    router.refresh();
  }

  const isLoading = saving || deleting;

  return (
    <>
      {/* Action Menu Container */}
      <div className="absolute right-0 top-0 z-10" ref={menuRef}>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="More options"
        >
          <Ellipsis size={20} />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Pencil size={15} />
              Edit
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Printer size={15} />
              Print
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-md"
          onClick={() => !saving && setModalOpen(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto space-y-5 rounded-[2rem] bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold dark:text-white">
                Edit Receipt
              </h2>

              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Merchant Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="merchantName"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Merchant Name
              </label>
              <input
                id="merchantName"
                type="text"
                disabled={saving}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100"
                placeholder="e.g. Starbucks"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            {/* Receipt Date */}
            <div className="space-y-1.5">
              <label
                htmlFor="receiptDate"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Receipt Date
              </label>
              <input
                id="receiptDate"
                type="date"
                disabled={saving}
                className="w-full max-w-full min-w-0 appearance-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100 [-webkit-appearance:none]"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>

            {/* Total */}
            <div className="space-y-1.5">
              <label
                htmlFor="total"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Total
              </label>
              <input
                id="total"
                type="number"
                step="0.01"
                disabled={saving}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-100"
                placeholder="0.00"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>

            {/* Participants Section */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Participants
              </label>

              {allParticipants.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {allParticipants.map((participant) => {
                    const isSelected = selectedParticipantIds.includes(
                      participant.id
                    );
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleParticipant(participant.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {isSelected ? <Check size={13} /> : <UserPlus size={13} />}
                        <span>{participant.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No participants available.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-3xl bg-slate-950 py-3 font-semibold text-white transition-opacity disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-md"
          onClick={() => !deleting && setDeleteConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-[2rem] bg-white p-6 text-center shadow-xl dark:bg-slate-900"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold dark:text-white">
                Delete Receipt?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this receipt? This action cannot be
                undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmOpen(false)}
                className="w-full rounded-3xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="w-full rounded-3xl bg-red-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Navigation Loader (Triggered during saving or deleting) */}
      {isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10 backdrop-blur-sm dark:bg-black/30">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
        </div>
      )}
    </>
  );
}