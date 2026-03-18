import Image from "next/image";
import Link from "next/link";
import { query } from "@/app/lib/db";
import { hotel, rooms as fallbackRooms } from "@/app/lib/hotel-data";
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: hotel.currency,
  maximumFractionDigits: 0,
});

export default async function RoomsPage() {
  const result = await query<RoomRow>(
    `SELECT id, name, description, size_sqm, beds, occupancy, view, base_rate, inventory
     FROM rooms
     ORDER BY base_rate DESC`
  );

  const roomRows =
    result.rows.length > 0
      ? result.rows
      : fallbackRooms.map((room) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          size_sqm: room.sizeSqm,
          beds: room.beds,
          occupancy: room.occupancy,
          view: room.view,
          base_rate: room.baseRate,
          inventory: room.inventory,
        }));

  const amenityLookup = new Map(
    fallbackRooms.map((room) => [room.id, room.amenities ?? []])
  );

  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Suites & rooms
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            Stay in a suite shaped for stillness
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-sage sm:text-base">
            Each residence pairs tailored lighting, curated art, and the warmth
            of coastal materials. Explore every suite, then dive deeper into the
            details before you book.
          </p>
        </div>
        <div className="rounded-[26px] border border-ink/10 bg-cloud/90 px-6 py-5 text-sm text-sage shadow-[0_20px_50px_rgba(44,45,39,0.08)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">
            Arrival details
          </p>
          <p className="mt-3 text-sm text-ink">
            Check-in {hotel.checkIn} · Check-out {hotel.checkOut}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-sage">
            Concierge
          </p>
          <p className="mt-2 text-sm text-ink">{hotel.address}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-sage">
            <a className="hover:text-ink" href={`tel:${hotel.phone}`}>
              {hotel.phone}
            </a>{" "}
            ·{" "}
            <a className="hover:text-ink" href={`mailto:${hotel.email}`}>
              {hotel.email}
            </a>
          </p>
        </div>
      </header>

      <section className="mt-10 space-y-8">
        {roomRows.map((room, index) => {
          const media = roomMedia[room.id]?.hero ?? roomMedia["harbor-suite"].hero;
          const highlights = amenityLookup.get(room.id)?.slice(0, 4) ?? [];

          return (
            <div
              key={room.id}
              className="overflow-hidden rounded-[32px] border border-ink/10 bg-cloud/90 shadow-[0_22px_60px_rgba(44,45,39,0.12)]"
            >
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative h-72 sm:h-96">
                  <Image
                    src={media.src}
                    alt={media.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                  />
                  <div className="absolute left-6 top-6 rounded-full bg-cloud/90 px-4 py-2 text-xs uppercase tracking-[0.25em] text-ink">
                    Suite {index + 1}
                  </div>
                  <div className="absolute bottom-6 left-6 rounded-full bg-ink px-4 py-2 text-xs uppercase tracking-[0.25em] text-cloud">
                    From {currencyFormatter.format(room.base_rate)}
                  </div>
                </div>

                <div className="flex flex-col justify-between px-6 pb-8 pt-6 sm:px-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-sage">
                      {room.view}
                    </p>
                    <h2 className="mt-2 font-display text-3xl text-ink">
                      {room.name}
                    </h2>
                    <p className="mt-3 text-sm text-sage">{room.description}</p>

                    <div className="mt-5 grid gap-3 text-xs uppercase tracking-[0.2em] text-sage sm:grid-cols-2">
                      <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3">
                        Size
                        <span className="mt-2 block text-sm font-semibold text-ink">
                          {room.size_sqm} sqm
                        </span>
                      </div>
                      <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3">
                        Bedding
                        <span className="mt-2 block text-sm font-semibold text-ink">
                          {room.beds}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3">
                        Occupancy
                        <span className="mt-2 block text-sm font-semibold text-ink">
                          {room.occupancy} guests
                        </span>
                      </div>
                      <div className="rounded-2xl border border-ink/10 bg-white/70 px-4 py-3">
                        Inventory
                        <span className="mt-2 block text-sm font-semibold text-ink">
                          {room.inventory} suites
                        </span>
                      </div>
                    </div>

                    {highlights.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-sage">
                        {highlights.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      className="rounded-full bg-ink px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cloud transition hover:bg-ink/90"
                      href={`/suites/${room.id}`}
                    >
                      See details
                    </Link>
                    <Link
                      className="rounded-full border border-ink/20 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink transition hover:border-ink/50"
                      href={`/booking?roomId=${room.id}`}
                    >
                      Check availability
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
