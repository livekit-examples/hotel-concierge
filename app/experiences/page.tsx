import Link from "next/link";
import { experiences } from "@/app/lib/hotel-data";

export default function ExperiencesPage() {
  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Experiences
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            Moments curated by the concierge
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            Local artisans, harbor mornings, and intimate evenings designed to
            feel personal and unrushed.
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

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {experiences.map((experience) => (
          <div
            key={experience.title}
            className="rounded-[28px] border border-ink/10 bg-cloud/90 px-6 py-6 shadow-[0_20px_55px_rgba(44,45,39,0.12)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-terracotta">
              {experience.duration}
            </p>
            <h2 className="mt-3 font-display text-2xl text-ink">
              {experience.title}
            </h2>
            <p className="mt-3 text-sm text-sage">{experience.description}</p>
            <p className="mt-4 text-sm text-ink">
              ${experience.price} per guest
            </p>
            <Link
              className="mt-6 inline-flex rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:border-ink/60"
              href="/booking"
            >
              Add to stay
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-[32px] border border-ink/10 bg-[#f3ece3] px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Custom itineraries
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              Tailor your day
            </h3>
          </div>
          <Link
            className="rounded-full bg-ink px-5 py-2 text-sm text-cloud"
            href="/booking"
          >
            Talk to concierge
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-sage">
          Let us know your style and preferred pace. We design itineraries that
          blend art, dining, and quiet harbor rituals.
        </p>
      </section>
    </div>
  );
}
