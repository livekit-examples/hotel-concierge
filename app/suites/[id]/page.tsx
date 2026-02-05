import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/app/lib/db";
import { rooms as fallbackRooms } from "@/app/lib/hotel-data";
import { roomMedia } from "@/app/lib/media";

type RoomRow = {
  id: string;
  name: string;
  description: string;
  size_sqm: number;
  beds: string;
  occupancy: number;
  view: string;
  base_rate: number;
  inventory: number;
};

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function SuitePage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const roomId = resolvedParams.id;

  const result = await query<RoomRow>(
    `SELECT id, name, description, size_sqm, beds, occupancy, view, base_rate, inventory
     FROM rooms
     WHERE id = $1`,
    [roomId]
  );

  const room =
    result.rows[0] ??
    (() => {
      const fallback = fallbackRooms.find((item) => item.id === roomId);
      if (!fallback) return null;
      return {
        id: fallback.id,
        name: fallback.name,
        description: fallback.description,
        size_sqm: fallback.sizeSqm,
        beds: fallback.beds,
        occupancy: fallback.occupancy,
        view: fallback.view,
        base_rate: fallback.baseRate,
        inventory: fallback.inventory,
      } satisfies RoomRow;
    })();

  if (!room) {
    notFound();
  }

  const amenities =
    fallbackRooms.find((item) => item.id === roomId)?.amenities ?? [
      "Signature linen set",
      "Rain shower",
      "Nespresso station",
      "Smart lighting",
    ];

  const media =
    roomMedia[roomId] ?? roomMedia["harbor-suite"];

  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Suites
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">{room.name}</h1>
          <p className="mt-3 max-w-2xl text-sm text-sage">
            {room.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink transition hover:border-ink/50"
            href="/rooms"
          >
            Back to suites
          </Link>
          <Link
            className="rounded-full bg-ink px-6 py-2 text-sm text-cloud transition hover:bg-ink/90"
            href={`/booking?roomId=${room.id}`}
          >
            Check availability
          </Link>
        </div>
      </header>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] bg-[#162521] text-cloud shadow-[0_30px_90px_rgba(23,37,34,0.35)]">
          <div className="relative h-64 sm:h-80">
            <Image
              src={media.hero.src}
              alt={media.hero.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
          <div className="relative px-8 py-10">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
              Signature suite
            </p>
            <h2 className="mt-4 font-display text-3xl">{room.view}</h2>
            <p className="mt-4 text-sm text-amber-100/80">
              Designed for slow mornings and late-night city lights, with layered
              textures and a calming coastal palette.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <div
                  key={amenity}
                  className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm"
                >
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-10 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">
            Suite details
          </p>
          <div className="mt-6 grid gap-4 text-sm text-sage">
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span>Size</span>
              <span className="text-ink">{room.size_sqm} sqm</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span>Bedding</span>
              <span className="text-ink">{room.beds}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span>Occupancy</span>
              <span className="text-ink">{room.occupancy} guests</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span>Inventory</span>
              <span className="text-ink">{room.inventory} suites</span>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-ink/10 bg-[#f3ece3] px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Starting rate
            </p>
            <p className="mt-2 font-display text-3xl text-ink">
              ${room.base_rate}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-sage">
              per night
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Concierge notes
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              Tailored to your stay
            </h3>
          </div>
          <Link
            className="rounded-full border border-ink/20 px-5 py-2 text-sm text-ink transition hover:border-ink/50"
            href="/booking"
          >
            Request preferences
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-sage">
          Add arrival details, pillow preferences, or celebration notes in the
          booking form. The concierge team curates your room in advance.
        </p>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Suite gallery
            </p>
            <h3 className="mt-2 font-display text-2xl text-ink">
              Visual highlights
            </h3>
          </div>
          <Link
            className="rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:border-ink/50"
            href={`/booking?roomId=${room.id}`}
          >
            Book this suite
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {media.gallery.map((item) => (
            <div
              key={item.src}
              className="relative h-56 overflow-hidden rounded-[26px] border border-ink/10 bg-cloud/80 shadow-[0_18px_45px_rgba(44,45,39,0.08)]"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
