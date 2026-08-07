import Header from "@/components/layout/Header";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center justify-start px-6 pt-20 md:min-h-[70vh] md:flex-row md:items-center md:justify-center md:gap-12">
          {/* Abstract background shapes */}
          <div
            className="
              pointer-events-none absolute
              -left-20 -top-10
              h-72 w-72
              rounded-full
              bg-purple-200/30
              blur-3xl
              dark:bg-purple-400/20
              md:left-1/2 md:top-0
              md:h-96 md:w-96
              md:-translate-x-[140%]
            "
          />

          <div
            className="
              pointer-events-none absolute
              -right-20 top-40
              h-80 w-80
              rounded-full
              bg-blue-200/30
              blur-3xl
              dark:bg-blue-400/20
              md:left-1/2 md:right-auto
              md:top-20
              md:h-[420px] md:w-[420px]
              md:translate-x-[80%]
            "
          />

          <div
            className="
              pointer-events-none absolute
              bottom-40 left-1/2
              h-80 w-80
              -translate-x-1/2
              rounded-full
              bg-pink-200/30
              blur-3xl
              dark:bg-pink-400/30
            "
          />
          
          {/* Left content */}
          <div className="flex-1 text-center md:text-left pt-20 md:pt-0">
            <Image
              src="/bb-black.png"
              alt="Bill Breaker Logo"
              width={300}
              height={60}
              className="mx-auto mb-8 rounded-3xl dark:hidden md:!hidden"
              priority
            />

            <Image
              src="/bb-white.png"
              alt="Bill Breaker Logo"
              width={300}
              height={60}
              className="mx-auto mb-8 hidden rounded-3xl dark:block md:!hidden"
              priority
            />

            <h1 className="ml-5 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
              Split bills without the hassle.
            </h1>

            <p className="ml-5 mt-6 max-w-2xl text-md text-slate-600 dark:text-slate-300">
              Bill Breaker makes splitting receipts simple. Upload a receipt,
              let AI read the items, and quickly calculate who owes what.
            </p>

            <div className="md:ml-5 ml0 w-full mt-8 flex justify-center gap-4 md:justify-start">
              <Link
                href="/receipts/new"
                className="rounded-2xl bg-slate-950 px-6 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Try it for free
              </Link>
            </div>
          </div>


          {/* App mockup */}
          <div className="flex-1">
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
              absolute -top-14 left-0
              h-14 w-full
              bg-slate-900
              dark:bg-slate-100
            "
            style={{
              clipPath: "polygon(0 100%, 100% 0, 100% 110%, 0 110%)",
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
    <div className="rounded-xl p-6 border-[1px] border-black/25 dark:border-black/10 shadow-[10px_10px_20px_rgba(0,0,0,0.15)]">
      <h3 className="text-md md:text-lg font-extrabold dark:text-black text-white">
        {title}
      </h3>

      <p className="text-sm md:text-md mt-3 dark:text-slate-600 text-slate-300">
        {description}
      </p>
    </div>
  );
}