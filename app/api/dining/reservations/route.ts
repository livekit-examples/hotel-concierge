import { NextResponse } from "next/server";
import { handleOptions, parseIsoDate, withCors } from "@/app/lib/api";
import { query } from "@/app/lib/db";

function buildConfirmationId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DIN-${stamp}-${random}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function OPTIONS() {
  return handleOptions();
}

type ReservationRow = {
  id: number;
  confirmation_id: string;
  venue: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venue = searchParams.get("venue");
  const date = parseIsoDate(searchParams.get("date"));

  const conditions: string[] = [];
  const params: Array<string> = [];

  if (venue) {
    params.push(venue);
    conditions.push(`venue = $${params.length}`);
  }

  if (date) {
    params.push(date.toISOString().slice(0, 10));
    conditions.push(`reservation_date = $${params.length}::date`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query<ReservationRow>(
      `SELECT id, confirmation_id, venue, reservation_date, reservation_time, party_size, name, email, phone, notes, status, created_at
       FROM dining_reservations
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    const reservations = result.rows.map((row) => ({
      id: row.id,
      confirmationId: row.confirmation_id,
      venue: row.venue,
      reservationDate: row.reservation_date,
      reservationTime: row.reservation_time,
      partySize: row.party_size,
      name: row.name,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
    }));

    return withCors(
      NextResponse.json({
        count: reservations.length,
        reservations,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Dining reservations table not initialized.",
          hint: "Run db/schema.sql against your database.",
        },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    venue?: string;
    reservationDate?: string;
    reservationTime?: string;
    partySize?: number;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  const missing: string[] = [];
  if (!payload.venue?.trim()) missing.push("venue");
  if (!payload.reservationDate?.trim()) missing.push("reservationDate");
  if (!payload.reservationTime?.trim()) missing.push("reservationTime");
  if (payload.partySize == null) missing.push("partySize");
  if (!payload.name?.trim()) missing.push("name");
  if (!payload.email?.trim()) missing.push("email");

  if (missing.length > 0) {
    return withCors(
      NextResponse.json(
        { error: "Missing required fields", missing },
        { status: 400 }
      )
    );
  }

  const reservationDate = parseIsoDate(payload.reservationDate ?? null);
  if (!reservationDate) {
    return withCors(
      NextResponse.json(
        { error: "Invalid reservationDate." },
        { status: 400 }
      )
    );
  }

  if (!isValidTime(payload.reservationTime ?? "")) {
    return withCors(
      NextResponse.json(
        { error: "Invalid reservationTime (HH:MM)." },
        { status: 400 }
      )
    );
  }

  const partySize = Number(payload.partySize);
  if (!Number.isFinite(partySize) || partySize <= 0) {
    return withCors(
      NextResponse.json(
        { error: "partySize must be a positive number." },
        { status: 400 }
      )
    );
  }

  const confirmationId = buildConfirmationId();

  try {
    const result = await query<ReservationRow>(
      `INSERT INTO dining_reservations
        (confirmation_id, venue, reservation_date, reservation_time, party_size, name, email, phone, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
       RETURNING id, confirmation_id, venue, reservation_date, reservation_time, party_size, name, email, phone, notes, status, created_at`,
      [
        confirmationId,
        payload.venue,
        payload.reservationDate,
        payload.reservationTime,
        partySize,
        payload.name,
        payload.email,
        payload.phone ?? null,
        payload.notes ?? null,
      ]
    );

    const reservation = result.rows[0];

    return withCors(
      NextResponse.json(
        {
          status: "confirmed",
          reservation: {
            id: reservation.id,
            confirmationId: reservation.confirmation_id,
            venue: reservation.venue,
            reservationDate: reservation.reservation_date,
            reservationTime: reservation.reservation_time,
            partySize: reservation.party_size,
            name: reservation.name,
            email: reservation.email,
            phone: reservation.phone,
            notes: reservation.notes,
            status: reservation.status,
            createdAt: reservation.created_at,
          },
        },
        { status: 201 }
      )
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Unable to create reservation.",
          hint: "Confirm that db/schema.sql has been applied.",
        },
        { status: 500 }
      )
    );
  }
}
