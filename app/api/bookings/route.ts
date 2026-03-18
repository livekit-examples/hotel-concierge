import { NextResponse } from "next/server";
import {
  handleOptions,
  parseIsoDate,
  seasonalMultiplier,
  withCors,
} from "@/app/lib/api";
import { query, withTransaction } from "@/app/lib/db";

function buildConfirmationId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AUR-${stamp}-${random}`;
}

export function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const bookingsResult = await query<{
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
    }>(
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
       LIMIT 25`
    );

    const bookingIds = bookingsResult.rows.map((row) => row.id);
    const roomsByBooking = new Map<
      number,
      {
        roomId: string;
        name: string;
        nightlyRate: number;
        currency: string;
        view: string;
      }[]
    >();

    if (bookingIds.length > 0) {
      const roomsResult = await query<{
        booking_id: number;
        room_id: string;
        nightly_rate: number;
        currency: string;
        name: string;
        view: string;
      }>(
        `SELECT br.booking_id,
                br.room_id,
                br.nightly_rate,
                br.currency,
                r.name,
                r.view
         FROM booking_rooms br
         JOIN rooms r ON r.id = br.room_id
         WHERE br.booking_id = ANY($1::bigint[])`,
        [bookingIds]
      );

      roomsResult.rows.forEach((row) => {
        const rooms = roomsByBooking.get(row.booking_id) ?? [];
        rooms.push({
          roomId: row.room_id,
          name: row.name,
          nightlyRate: row.nightly_rate,
          currency: row.currency,
          view: row.view,
        });
        roomsByBooking.set(row.booking_id, rooms);
      });
    }

    const bookings = bookingsResult.rows.map((row) => ({
      id: row.id,
      confirmationId: row.confirmation_id,
      checkIn: row.check_in,
      checkOut: row.check_out,
      guests: row.guests,
      status: row.status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      guest: {
        id: row.guest_id,
        name: row.guest_name,
        email: row.guest_email,
        phone: row.guest_phone,
      },
      rooms: roomsByBooking.get(row.id) ?? [],
    }));

    return withCors(
      NextResponse.json({
        count: bookings.length,
        bookings,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Bookings table not initialized.",
          hint: "Run db/schema.sql against your database.",
        },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    roomId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    name?: string;
    email?: string;
    phone?: string;
    specialRequests?: string;
    guestNotes?: string;
  };

  const missing: string[] = [];

  if (!payload.roomId?.trim()) missing.push("roomId");
  if (!payload.checkIn?.trim()) missing.push("checkIn");
  if (!payload.checkOut?.trim()) missing.push("checkOut");
  if (payload.guests == null) missing.push("guests");
  if (!payload.name?.trim()) missing.push("name");
  if (!payload.email?.trim()) missing.push("email");

  if (missing.length > 0) {
    return withCors(
      NextResponse.json(
        {
          error: "Missing required fields",
          missing,
        },
        { status: 400 }
      )
    );
  }

  const confirmationId = buildConfirmationId();
  const checkInDate = parseIsoDate(payload.checkIn ?? null);
  const checkOutDate = parseIsoDate(payload.checkOut ?? null);
  const guestsCount = Number(payload.guests);

  if (!checkInDate || !checkOutDate) {
    return withCors(
      NextResponse.json(
        { error: "Invalid check-in or check-out date." },
        { status: 400 }
      )
    );
  }

  if (!Number.isFinite(guestsCount) || guestsCount <= 0) {
    return withCors(
      NextResponse.json({ error: "Guests must be a positive number." }, { status: 400 })
    );
  }

  if (checkOutDate <= checkInDate) {
    return withCors(
      NextResponse.json(
        { error: "Check-out must be after check-in." },
        { status: 400 }
      )
    );
  }

  try {
    const booking = await withTransaction(async (client) => {
      const roomResult = await client.query<{
        id: string;
        name: string;
        base_rate: number;
        view: string;
      }>(
        `SELECT id, name, base_rate, view
         FROM rooms
         WHERE id = $1`,
        [payload.roomId]
      );

      if (roomResult.rowCount === 0) {
        throw new Error("ROOM_NOT_FOUND");
      }

      const guestResult = await client.query<{
        id: number;
        full_name: string;
        email: string;
        phone: string | null;
        notes: string | null;
      }>(
        `INSERT INTO guests (full_name, email, phone, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET full_name = EXCLUDED.full_name,
                       phone = COALESCE(EXCLUDED.phone, guests.phone),
                       notes = COALESCE(EXCLUDED.notes, guests.notes)
         RETURNING id, full_name, email, phone, notes`,
        [
          payload.name,
          payload.email,
          payload.phone ?? null,
          payload.guestNotes ?? null,
        ]
      );

      const guest = guestResult.rows[0];

      const bookingResult = await client.query<{
        id: number;
        confirmation_id: string;
        check_in: string;
        check_out: string;
        guests: number;
        status: string;
        special_requests: string | null;
        created_at: string;
      }>(
        `INSERT INTO bookings
          (confirmation_id, guest_id, check_in, check_out, guests, status, special_requests)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)
         RETURNING id, confirmation_id, check_in, check_out, guests, status, special_requests, created_at`,
        [
          confirmationId,
          guest.id,
          payload.checkIn,
          payload.checkOut,
          guestsCount,
          payload.specialRequests ?? null,
        ]
      );

      const bookingRow = bookingResult.rows[0];
      const nightlyRate = Math.round(
        roomResult.rows[0].base_rate * seasonalMultiplier(checkInDate)
      );

      await client.query(
        `INSERT INTO booking_rooms (booking_id, room_id, nightly_rate, currency)
         VALUES ($1, $2, $3, 'USD')`,
        [bookingRow.id, roomResult.rows[0].id, nightlyRate]
      );

      return {
        id: bookingRow.id,
        confirmationId: bookingRow.confirmation_id,
        checkIn: bookingRow.check_in,
        checkOut: bookingRow.check_out,
        guests: bookingRow.guests,
        status: bookingRow.status,
        specialRequests: bookingRow.special_requests,
        createdAt: bookingRow.created_at,
        guest,
        room: {
          id: roomResult.rows[0].id,
          name: roomResult.rows[0].name,
          view: roomResult.rows[0].view,
          nightlyRate,
          currency: "USD",
        },
      };
    });

    return withCors(
      NextResponse.json(
        {
          status: "confirmed",
          booking,
          message:
            "This is a demo booking. Integrate your PMS or payment provider to finalize stays.",
        },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ROOM_NOT_FOUND") {
      return withCors(
        NextResponse.json(
          { error: "Room not found." },
          { status: 404 }
        )
      );
    }

    return withCors(
      NextResponse.json(
        {
          error: "Unable to create booking.",
          hint: "Confirm that db/schema.sql and db/seed.sql have been applied.",
        },
        { status: 500 }
      )
    );
  }
}
