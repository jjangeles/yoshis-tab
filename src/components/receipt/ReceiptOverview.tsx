export default function ReceiptOverview() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Receipt overview</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Preview the receipt data after AI extraction and assign items to participants.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Merchant</p>
          <p className="mt-2 text-base font-medium text-slate-900">TBD</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-base font-medium text-slate-900">PHP 0.00</p>
        </div>
      </div>
    </section>
  );
}
