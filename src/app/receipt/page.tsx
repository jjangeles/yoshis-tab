import Container from "@/components/ui/Container";
import ReceiptOverview from "@/components/receipt/ReceiptOverview";

export default function ReceiptPage() {
  return (
    <Container>
      <div className="py-16">
        <h1 className="text-3xl font-semibold text-slate-950">Receipt</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          This page will display the receipt details and participant assignments.
        </p>
        <div className="mt-10">
          <ReceiptOverview />
        </div>
      </div>
    </Container>
  );
}
