import Image from "next/image";
import Link from "next/link";
import ReservationForm from "@/app/dining/ReservationForm";
import { amenityMedia } from "@/app/lib/media";

export default function BrassEmberPage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Dining
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            Brass & Ember Steakhouse
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            A modern steakhouse featuring open-fire grills, coastal smoke, and
            a cellar of reserve reds.
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
        <div className="overflow-hidden rounded-[32px] bg-[#1c1d1a] text-cloud shadow-[0_30px_90px_rgba(23,37,34,0.35)]">
          <div className="relative h-64 sm:h-80">
            <Image
              src={amenityMedia.steakhouse.src}
              alt={amenityMedia.steakhouse.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
          <div className="relative z-10 px-8 py-10">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
              Open fire
            </p>
            <h2 className="mt-4 font-display text-3xl">
              Char + coastal smoke
            </h2>
            <p className="mt-4 text-sm text-amber-100/80">
              Prime cuts, dry-aged selections, and a late-night lounge with
              signature cocktails.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Dry-aged steak program",
                "Open-fire grill",
                "Reserve cellar list",
                "Private dining salon",
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
              { label: "Dinner", value: "5:00 PM – 11:00 PM" },
              { label: "Lounge", value: "5:00 PM – 12:00 AM" },
              { label: "Private dining", value: "By appointment" },
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
              Request a sommelier pairing with your reservation.
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
              Reserve at Brass & Ember
            </h3>
          </div>
          <Link
            className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink transition hover:border-ink/50"
            href="/booking"
          >
            Add to stay
          </Link>
        </div>
        <ReservationForm venue="brass-ember" venueLabel="Brass & Ember" />
      </section>
    </div>
  );
}
