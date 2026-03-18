import Link from "next/link";
import { packages } from "@/app/lib/hotel-data";

export default function OffersPage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Seasonal offers
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            Curated stay packages
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            Thoughtfully layered stays designed for long weekends, wellness
            rituals, and art-forward getaways.
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
            Check availability
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            className="rounded-[28px] border border-ink/10 bg-cloud/90 px-6 py-6 shadow-[0_20px_55px_rgba(44,45,39,0.12)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-terracotta">
              {pkg.highlight}
            </p>
            <h2 className="mt-3 font-display text-2xl text-ink">{pkg.name}</h2>
            <p className="mt-3 text-sm text-sage">{pkg.description}</p>
            <Link
              className="mt-6 inline-flex rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:border-ink/60"
              href="/booking"
            >
              Request this offer
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-[32px] border border-ink/10 bg-[#f3ece3] px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Concierge planning
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              Customize your stay
            </h3>
          </div>
          <Link
            className="rounded-full bg-ink px-5 py-2 text-sm text-cloud"
            href="/booking"
          >
            Build my itinerary
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-sage">
          Let us know what you love. The concierge team will personalize dining,
          wellness, and neighborhood itineraries before you arrive.
        </p>
      </section>
    </div>
  );
}
