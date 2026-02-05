import Link from "next/link";

export default function LoungePage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Lounge
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            Library Lounge
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            A candlelit salon with vinyl listening stations, artisan teas, and
            a quiet collection of coastal literature.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink transition hover:border-ink/50"
            href="/"
          >
            Back to hotel
          </Link>
          <Link
            className="rounded-full bg-ink px-6 py-2 text-sm text-cloud transition hover:bg-ink/90"
            href="/booking"
          >
            Plan your stay
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] bg-[#1c2622] text-cloud shadow-[0_30px_90px_rgba(23,37,34,0.35)]">
          <div className="relative px-8 py-10">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
              Evening lounge
            </p>
            <h2 className="mt-4 font-display text-3xl">Vinyl & cocktails</h2>
            <p className="mt-4 text-sm text-amber-100/80">
              A softly lit retreat for crafted cocktails, curated records, and
              intimate conversation.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Vinyl listening alcoves",
                "Artisan tea service",
                "Library lending shelves",
                "Nightly cocktail ritual",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-10 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">Hours</p>
          <div className="mt-6 space-y-4 text-sm text-sage">
            {[
              { label: "Daily", value: "12:00 PM – 12:00 AM" },
              { label: "Tea ritual", value: "2:00 PM – 5:00 PM" },
              { label: "Vinyl sessions", value: "7:00 PM – 10:30 PM" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3"
              >
                <span>{row.label}</span>
                <span className="text-ink">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-ink/10 bg-[#f3ece3] px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Lounge reservations
            </p>
            <p className="mt-2 text-sm text-sage">
              Reserve a quiet corner for private tastings or small gatherings.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
