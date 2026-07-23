"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import Container from "@/components/ui/Container";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

export default function NewReceiptPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [total, setTotal] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      setImageFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Image must be 5MB or smaller.");
      setImageFile(null);
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!imageFile) {
      setError("Please select a receipt image to upload.");
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    const supabase = createBrowserSupabase();
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session;

    if (sessionResult.error || !session?.user) {
      setError("Unable to verify current user.");
      setLoading(false);
      return;
    }

    const parsedSubtotal = Number(subtotal || 0);
    const parsedTax = Number(tax || 0);
    const parsedServiceCharge = Number(serviceCharge || 0);
    const parsedDiscount = Number(discount || 0);
    const parsedTotal = Number(total || 0);

    const receiptPayload = {
      owner_id: session.user.id,
      merchant_name: merchantName || null,
      receipt_date: receiptDate || null,
      subtotal: parsedSubtotal,
      tax: parsedTax,
      service_charge: parsedServiceCharge,
      discount: parsedDiscount,
      total: parsedTotal,
      currency: "PHP",
      image_url: null,
    };

    const insertResult = await supabase
      .from("receipts")
      .insert([receiptPayload] as any)
      .select("id");

    if (insertResult.error) {
      setError(insertResult.error.message || "Failed to create receipt.");
      setLoading(false);
      return;
    }

    const insertedData = insertResult.data as Array<{ id: string }> | null;
    const receiptId = insertedData?.[0]?.id;

    if (!receiptId) {
      setError("Receipt was created but could not read its ID.");
      setLoading(false);
      return;
    }

    setUploadProgress(40);

    const filename = encodeURIComponent(imageFile.name.replace(/\s+/g, "_"));
    const storagePath = `receipts/${session.user.id}/${receiptId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("receipt-images")
      .upload(storagePath, imageFile, { upsert: false });

    if (uploadError) {
      setError(uploadError.message || "Failed to upload receipt image.");
      setLoading(false);
      return;
    }

    setUploadProgress(80);

    const { data: updateData, error: updateError } = await (supabase.from("receipts") as any)
      .update({ image_url: storagePath })
      .eq("id", receiptId)
      .select("id, image_url")
      .single();

    console.log("Image URL update:", {
      receiptId,
      storagePath,
      updateError,
      updateData,
    });

    if (updateError) {
      setError(updateError.message || "Failed to save receipt image URL.");
      setLoading(false);
      return;
    }

    if (!updateData?.image_url) {
      setError("Receipt image update did not persist.");
      setLoading(false);
      return;
    }

    setUploadProgress(100);
    setLoading(false);

    router.push(`/receipts/${receiptId}`);
  };

  return (
    <Container>
      <div className="mx-auto max-w-3xl py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">Create Receipt</h1>
          <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Receipt image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:text-white"
              />
            </div>
            {previewUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Preview</p>
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="mt-3 max-h-80 w-full object-contain rounded-2xl"
                />
              </div>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Merchant name</label>
                <input
                  value={merchantName}
                  onChange={(event) => setMerchantName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Receipt date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax</label>
                <input
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Service charge</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceCharge}
                  onChange={(event) => setServiceCharge(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Discount</label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Total</label>
              <input
                type="number"
                step="0.01"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </div>
            {uploadProgress > 0 ? (
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-sm text-slate-600">Upload progress</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-950 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Uploading receipt..." : "Create Receipt"}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
