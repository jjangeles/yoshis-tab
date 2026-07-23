import ReceiptOverview from "@/components/receipt/ReceiptOverview";

export default function ReceiptPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto w-full max-w-md space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Receipt preview
          </p>
          <h1 className="text-3xl font-semibold">Receipt</h1>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
            This page will display the receipt details and participant assignments.
          </p>
        </section>
        <ReceiptOverview />
      </main>
    </div>
  );
}
