"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ReceiptImageViewer({ imageUrl }: { imageUrl: string|null|undefined }) {
  const [open, setOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOpen = () => {
    setImageLoading(true);
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center rounded-3xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
      >
        View Image
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-5 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-full overflow-hidden rounded-md bg-white shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X size={20} />
            </button>

            {imageLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-950 dark:border-slate-700 dark:border-t-slate-100" />
              </div>
            )}

            <img
              src={imageUrl}
              alt="Receipt"
              onLoad={() => setImageLoading(false)}
              className="max-h-[90vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}