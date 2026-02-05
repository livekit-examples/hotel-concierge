import BlockForm from "@/app/admin/BlockForm";
import { query } from "@/app/lib/db";

type RoomRow = {
  id: string;
  name: string;
  occupancy: number;
  base_rate: number;
  inventory: number;
  view: string;
};

type BookingRow = {
  id: number;
  confirmation_id: string;
  guest_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  special_requests: string | null;
  created_at: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
};

type BookingRoomRow = {
  booking_id: number;
  room_id: string;
  nightly_rate: number;
  currency: string;
  name: string;
};

type GuestRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type BlockRow = {
  id: number;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

type DiningRow = {
  id: number;
  confirmation_id: string;
  venue: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
};

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default async function AdminPage() {
  const [
    roomsResult,
    bookingsResult,
    guestsResult,
    blocksResult,
    diningResult,
    statsResult,
  ] = await Promise.all([
      query<RoomRow>(
        `SELECT id, name, occupancy, base_rate, inventory, view
         FROM rooms
         ORDER BY base_rate DESC`
      ),
      query<BookingRow>(
        `SELECT b.id,
                b.confirmation_id,
                b.guest_id,
                b.check_in,
                b.check_out,
                b.guests,
                b.status,
                b.special_requests,
                b.created_at,
                g.full_name AS guest_name,
                g.email AS guest_email,
                g.phone AS guest_phone
         FROM bookings b
         JOIN guests g ON g.id = b.guest_id
         ORDER BY b.created_at DESC
         LIMIT 20`
      ),
      query<GuestRow>(
        `SELECT id, full_name, email, phone, notes, created_at
         FROM guests
         ORDER BY created_at DESC
         LIMIT 20`
      ),
      query<BlockRow>(
        `SELECT id, room_id, start_date, end_date, reason, created_at
         FROM availability_blocks
         ORDER BY start_date DESC
         LIMIT 20`
      ),
      query<DiningRow>(
        `SELECT id, confirmation_id, venue, reservation_date, reservation_time, party_size, name, email, phone, status, created_at
         FROM dining_reservations
         ORDER BY created_at DESC
         LIMIT 20`
      ),
      query<{ total_rooms: number; total_bookings: number; upcoming: number }>(
        `SELECT
           (SELECT COUNT(*)::int FROM rooms) AS total_rooms,
           (SELECT COUNT(*)::int FROM bookings) AS total_bookings,
           (SELECT COUNT(*)::int FROM bookings WHERE check_in >= CURRENT_DATE) AS upcoming`
      ),
    ] as const);

  const bookingIds = bookingsResult.rows.map((row) => row.id);
  const roomsByBooking = new Map<number, BookingRoomRow[]>();

  if (bookingIds.length > 0) {
    const bookingRoomsResult = await query<BookingRoomRow>(
      `SELECT br.booking_id,
              br.room_id,
              br.nightly_rate,
              br.currency,
              r.name
       FROM booking_rooms br
       JOIN rooms r ON r.id = br.room_id
       WHERE br.booking_id = ANY($1::bigint[])`,
      [bookingIds]
    );

    bookingRoomsResult.rows.forEach((row) => {
      const existing = roomsByBooking.get(row.booking_id) ?? [];
      existing.push(row);
      roomsByBooking.set(row.booking_id, existing);
    });
  }

  const stats = statsResult.rows[0] ?? {
    total_rooms: 0,
    total_bookings: 0,
    upcoming: 0,
  };

  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sage">
            Aurum Atelier
          </p>
          <h1 className="mt-3 font-display text-4xl text-ink">
            Admin Atelier
          </h1>
          <p className="mt-2 text-sm text-sage">
            Monitor bookings, manage availability, and coordinate guest stays.
          </p>
        </div>
        <div className="rounded-[28px] border border-ink/10 bg-cloud/90 px-6 py-4 text-sm text-sage shadow-[0_18px_50px_rgba(44,45,39,0.08)]">
          <p className="text-xs uppercase tracking-[0.25em] text-sage">
            System status
          </p>
          <p className="mt-2 text-lg text-ink">Connected</p>
          <p className="text-xs uppercase tracking-[0.25em] text-sage">
            Updated {formatDate(new Date().toISOString())}
          </p>
        </div>
      </header>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Rooms",
            value: stats.total_rooms,
            helper: "Active room types",
          },
          {
            label: "Bookings",
            value: stats.total_bookings,
            helper: "All-time reservations",
          },
          {
            label: "Upcoming",
            value: stats.upcoming,
            helper: "Check-ins this week",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[28px] border border-ink/10 bg-cloud/90 px-6 py-6 shadow-[0_18px_50px_rgba(44,45,39,0.08)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              {stat.label}
            </p>
            <p className="mt-4 font-display text-4xl text-ink">{stat.value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-sage">
              {stat.helper}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sage">
                Recent bookings
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink">
                Reservations overview
              </h2>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-sage">
              Last 20 bookings
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            {bookingsResult.rows.map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {booking.guest_name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-sage">
                      {booking.confirmation_id}
                    </p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.2em] text-sage">
                    {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-sage">
                  <span>
                    {booking.guests} guest{booking.guests === 1 ? "" : "s"} ·{" "}
                    {booking.status}
                  </span>
                  <span>
                    {roomsByBooking.get(booking.id)?.map((room) => room.name).join(", ") ||
                      "Room assigned"}
                  </span>
                </div>
                {booking.special_requests && (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-terracotta">
                    {booking.special_requests}
                  </p>
                )}
              </div>
            ))}
            {bookingsResult.rows.length === 0 && (
              <p className="text-sm text-sage">
                No bookings yet. Create a reservation from the main site.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[32px] bg-[#1c2622] px-8 py-8 text-cloud shadow-[0_22px_60px_rgba(10,16,14,0.35)]">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
            Availability blocks
          </p>
          <h2 className="mt-3 font-display text-3xl">Manage holds</h2>
          <p className="mt-2 text-sm text-amber-100/70">
            Reserve suites for maintenance, VIP arrivals, or private events.
          </p>

          <BlockForm
            rooms={roomsResult.rows.map((room) => ({
              id: room.id,
              name: room.name,
            }))}
          />

          <div className="mt-8 space-y-3 text-sm">
            {blocksResult.rows.map((block) => (
              <div
                key={block.id}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
              >
                <p className="font-semibold text-cloud">{block.room_id}</p>
                <p className="text-amber-100/70">
                  {formatDate(block.start_date)} → {formatDate(block.end_date)}
                </p>
                {block.reason && (
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    {block.reason}
                  </p>
                )}
              </div>
            ))}
            {blocksResult.rows.length === 0 && (
              <p className="text-sm text-amber-100/70">
                No active holds. Create one above.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">Guests</p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            Recent arrivals
          </h2>
          <div className="mt-6 space-y-4">
            {guestsResult.rows.map((guest) => (
              <div
                key={guest.id}
                className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4"
              >
                <p className="text-sm font-semibold text-ink">{guest.full_name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-sage">
                  {guest.email} · {guest.phone ?? "No phone"}
                </p>
                {guest.notes && (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-terracotta">
                    {guest.notes}
                  </p>
                )}
              </div>
            ))}
            {guestsResult.rows.length === 0 && (
              <p className="text-sm text-sage">No guest profiles yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">Rooms</p>
          <h2 className="mt-2 font-display text-3xl text-ink">
            Inventory snapshot
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {roomsResult.rows.map((room) => (
              <div
                key={room.id}
                className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4"
              >
                <p className="text-sm font-semibold text-ink">{room.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-sage">
                  {room.view} · {room.occupancy} guests
                </p>
                <p className="mt-2 text-sm text-sage">
                  ${room.base_rate} · {room.inventory} suites
                </p>
              </div>
            ))}
            {roomsResult.rows.length === 0 && (
              <p className="text-sm text-sage">No rooms found.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-14 rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-8 shadow-[0_22px_60px_rgba(44,45,39,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Dining reservations
            </p>
            <h2 className="mt-2 font-display text-3xl text-ink">
              Restaurant bookings
            </h2>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-sage">
            Last 20 reservations
          </p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {diningResult.rows.map((reservation) => (
            <div
              key={reservation.id}
              className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {reservation.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-sage">
                    {reservation.confirmation_id}
                  </p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.2em] text-sage">
                  {reservation.venue.replace(/-/g, " ")}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-sage">
                <span>
                  {reservation.party_size} guests · {reservation.status}
                </span>
                <span>
                  {formatDate(reservation.reservation_date)} ·{" "}
                  {reservation.reservation_time.slice(0, 5)}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-sage">
                {reservation.email} · {reservation.phone ?? "No phone"}
              </p>
            </div>
          ))}
          {diningResult.rows.length === 0 && (
            <p className="text-sm text-sage">
              No dining reservations yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
