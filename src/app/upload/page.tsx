import Container from "@/components/ui/Container";

export default function UploadPage() {
  return (
    <Container>
      <div className="py-16">
        <h1 className="text-3xl font-semibold text-slate-950">Upload Receipt</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Upload an image of your receipt and let the AI extract items, taxes,
          and charges into a structured split bill format.
        </p>
      </div>
    </Container>
  );
}
