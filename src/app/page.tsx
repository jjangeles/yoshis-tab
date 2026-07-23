import Link from "next/link";
import Container from "@/components/ui/Container";

export default function HomePage() {
  return (
    <Container>
      <div className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="text-4xl font-semibold text-slate-950">Split Receipt</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Sign in or register to upload receipts, assign participants, and split bills.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Register
          </Link>
        </div>
      </div>
    </Container>
  );
}
