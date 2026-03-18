import { NextResponse } from "next/server";
import {
  handleOptions,
  nightsBetween,
  parseIsoDate,
  seasonalMultiplier,
  withCors,
} from "@/app/lib/api";
import { query } from "@/app/lib/db";

export function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkIn = parseIsoDate(searchParams.get("checkIn"));
  const checkOut = parseIsoDate(searchParams.get("checkOut"));
  const guests = Number(searchParams.get("guests") ?? 2);
  const nights = nightsBetween(checkIn, checkOut);
  const season = seasonalMultiplier(checkIn ?? new Date());

  try {
    const roomsResult = await query<{
      id: string;
      name: string;
      description: string;
      size_sqm: number;
      beds: string;
      occupancy: number;
      view: string;
      base_rate: number;
      inventory: number;
    }>(
      `SELECT id, name, description, size_sqm, beds, occupancy, view, base_rate, inventory
       FROM rooms
       ORDER BY base_rate ASC`
    );

    const rooms = roomsResult.rows.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      sizeSqm: room.size_sqm,
      beds: room.beds,
      occupancy: room.occupancy,
      view: room.view,
      baseRate: room.base_rate,
      inventory: room.inventory,
    }));

    const bookedByRoom = new Map<string, number>();
    const blockedByRoom = new Map<string, number>();

    if (checkIn && checkOut) {
      const bookingsResult = await query<{
        room_id: string;
        booked: number;
      }>(
        `SELECT br.room_id, COUNT(*)::int AS booked
         FROM booking_rooms br
         JOIN bookings b ON b.id = br.booking_id
         WHERE b.status <> 'cancelled'
           AND b.check_in < $2::date
           AND b.check_out > $1::date
         GROUP BY br.room_id`,
        [checkIn.toISOString().slice(0, 10), checkOut.toISOString().slice(0, 10)]
      );

      bookingsResult.rows.forEach((row) => {
        bookedByRoom.set(row.room_id, row.booked);
      });

      const blocksResult = await query<{
        room_id: string;
        blocked: number;
      }>(
        `SELECT room_id, COUNT(*)::int AS blocked
         FROM availability_blocks
         WHERE start_date < $2::date
           AND end_date > $1::date
         GROUP BY room_id`,
        [checkIn.toISOString().slice(0, 10), checkOut.toISOString().slice(0, 10)]
      );

      blocksResult.rows.forEach((row) => {
        blockedByRoom.set(row.room_id, row.blocked);
      });
    }

    const availability = rooms.map((room) => {
      const booked = bookedByRoom.get(room.id) ?? 0;
      const blocked = blockedByRoom.get(room.id) ?? 0;
      const remaining = Math.max(0, room.inventory - booked - blocked);
      const fits = guests <= room.occupancy;
      const nightlyRate = Math.round(room.baseRate * season);
      const total = nightlyRate * nights;

      return {
        roomId: room.id,
        name: room.name,
        available: fits && remaining > 0,
        remaining,
        nightlyRate,
        total,
        currency: "USD",
        inventory: room.inventory,
      };
    });

    return withCors(
      NextResponse.json({
        checkIn: checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: checkOut?.toISOString().slice(0, 10) ?? null,
        nights,
        guests,
        availability,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Availability data not initialized.",
          hint: "Run db/schema.sql and db/seed.sql against your database.",
        },
        { status: 500 }
      )
    );
  }
}
