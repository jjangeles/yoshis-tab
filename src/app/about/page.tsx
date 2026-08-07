import Header from "@/components/layout/Header";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
        {/* Hero */}
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 md:flex-row md:gap-12">
          
          {/* Left content */}
          <div className="flex-1 text-center md:text-left pt-20 md:pt-0">
            <Image
              src="/bb-white.png"
              alt="Bill Breaker Logo"
              width={300}
              height={60}
              className="mx-auto mb-8 hidden rounded-3xl dark:block"
              priority
            />

            <Image
              src="/bb-black.png"
              alt="Bill Breaker Logo"
              width={300}
              height={60}
              className="mx-auto mb-8 rounded-3xl dark:hidden"
              priority
            />

            <h1 className="ml-5 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
              Split bills without the hassle.
            </h1>

            <p className="ml-5 mt-6 max-w-2xl text-md text-slate-600 dark:text-slate-300">
              Bill Breaker makes splitting receipts simple. Upload a receipt,
              let AI read the items, and quickly calculate who owes what.
            </p>

            <div className="w-full mt-8 flex justify-center gap-4 md:justify-start">
              <Link
                href="/receipts/new"
                className="rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Try it for free
              </Link>
            </div>
          </div>


          {/* App mockup */}
          <div className="mt-12 flex-1 md:mt-0">
            <Image
              src="/bb-mockup.png"
              alt="Bill Breaker App Preview"
              width={500}
              height={800}
              className="mx-auto rounded-3xl drop-shadow-2xl"
              priority
            />
          </div>

        </section>

        {/* Features */}
        <section
          className="
            relative mt-20
              bg-slate-900
              dark:bg-slate-100
          "
        >
          {/* diagonal divider */}
          <div
            className="
              absolute -top-12 left-0 h-12 w-full
              bg-slate-900
              dark:bg-slate-100
            "
            style={{
              clipPath: "polygon(0 100%, 100% 0, 100% 100%, 0 100%)",
            }}
          />
          <div className="mx-auto grid max-w-5xl gap-6 px-6 py-20 md:grid-cols-3">
            
            <Feature
              title="AI Receipt Scanning"
              description="Upload a receipt and automatically extract items, prices, taxes, and totals."
            />

            <Feature
              title="Easy Item Assignment"
              description="Choose exactly what each person ordered instead of guessing percentages."
            />

            <Feature
              title="Fair Splitting"
              description="Automatically handle taxes, service charges, discounts, and shared costs."
            />

          </div>
        </section>

        {/* Footer */}
        <footer className="py-2 text-center text-sm text-slate-500 bg-slate-900 dark:bg-slate-100">
          © {new Date().getFullYear()} Bill Breaker. Split smarter.
        </footer>
      </main>
    </>
  );
}


function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border dark:border-slate-200 p-6 border-slate-800">
      <h3 className="text-xl font-extrabold dark:text-black text-white">
        {title}
      </h3>

      <p className="mt-3 dark:text-slate-600 text-slate-300">
        {description}
      </p>
    </div>
  );
}