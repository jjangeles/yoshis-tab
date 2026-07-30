"use client";

import { useEffect, useState, type ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Upload, X } from "lucide-react";

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
  const [uploadProgress, setUploadProgress] = useState(90);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeImage = () => {
    setImageFile(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleParse = async (receiptId: string) => {
    setParseError(null);
    setParsing(true);

    try {
      const response = await fetch(`/api/receipts/${receiptId}/parse`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to parse receipt.");
      }

      const body = await response.json().catch(() => null);

      if (!body?.success) {
        throw new Error(body?.error || "Failed to parse receipt.");
      }

      return true;
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Failed to parse receipt."
      );
      return false;
    } finally {
      setParsing(false);
    }
  };

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

    setUploadProgress(0);

    // Start parsing receipt
    let parsed = false;
    const attempts = 2;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      parsed = await handleParse(receiptId);

      if (parsed) {
        break;
      }

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!parsed) {
      setLoading(false);
      return;
    }

    setLoading(false);

    router.push(`/receipts/${receiptId}`);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">

      {(loading || parsing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[90%] max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                {parsing ? "Reading receipt" : "Uploading receipt"}
              </h2>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              {parsing ? (
                <div 
                  key="parsing-bar"
                  className="h-full w-full animate-pulse rounded-full bg-slate-950 dark:bg-slate-100" 
                />
              ) : (
                <div
                  key="upload-bar"
                  className="h-full rounded-full bg-slate-950 transition-all duration-300 dark:bg-slate-100"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Please wait...
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-md space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            New receipt
          </p>
          <h1 className="text-3xl font-semibold">Create receipt</h1>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload a receipt image and capture the totals for later splitting.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 shadow-none">
          
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full rounded-xl object-contain"
              />

              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-700"
                title="Remove image"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between max-w-[20rem] mx-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex gap-2 w-full py-2 items-center justify-center rounded-[1rem] bg-slate-950 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
                title="Upload image"
              >
                <p>Select Image</p>
                <div>
                  <Upload size={20} />
                </div>
              </button>
            </div>
          )}

          {error ? (
            <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
          ) : null}
          {previewUrl ? (
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-3xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Upload receipt
            </button>
          ): null}
        </form>
      </main>
    </div>
  );
}
