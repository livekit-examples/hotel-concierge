import Link from "next/link";
import ReservationForm from "@/app/dining/ReservationForm";

export default function AtriumBarPage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Dining
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            The Atrium Bar
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            A glass‑roofed cocktail bar with live jazz, velvet seating, and a
            curated menu of coastal spirits.
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
            Reserve a stay
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] bg-[#1b2220] text-cloud shadow-[0_30px_90px_rgba(23,37,34,0.35)]">
          <div className="relative px-8 py-10">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
              Nightly ritual
            </p>
            <h2 className="mt-4 font-display text-3xl">Live jazz & cocktails</h2>
            <p className="mt-4 text-sm text-amber-100/80">
              Candlelit evenings, vinyl-inspired cocktails, and a live trio
              every Thursday through Sunday.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Signature cocktail flights",
                "Live jazz evenings",
                "Small plates menu",
                "Velvet lounge seating",
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
              { label: "Daily", value: "4:00 PM – 12:00 AM" },
              { label: "Live jazz", value: "8:00 PM – 10:30 PM" },
              { label: "Small plates", value: "5:00 PM – 11:00 PM" },
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
              Reserve a table
            </p>
            <p className="mt-2 text-sm text-sage">
              Ask the concierge to reserve a lounge table or bar seating.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Table reservations
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              Reserve at The Atrium Bar
            </h3>
          </div>
          <Link
            className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink transition hover:border-ink/50"
            href="/booking"
          >
            Add to stay
          </Link>
        </div>
        <ReservationForm venue="atrium-bar" venueLabel="The Atrium Bar" />
      </section>
    </div>
  );
}
