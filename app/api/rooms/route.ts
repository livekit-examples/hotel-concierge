import { NextResponse } from "next/server";
import { handleOptions, withCors } from "@/app/lib/api";
import { query } from "@/app/lib/db";

export function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const result = await query<{
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

    const rooms = result.rows.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      sizeSqm: room.size_sqm,
      beds: room.beds,
      occupancy: room.occupancy,
      view: room.view,
      baseRate: room.base_rate,
      inventory: room.inventory,
      amenities: [],
    }));

    return withCors(
      NextResponse.json({
        count: rooms.length,
        rooms,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Rooms table not initialized.",
          hint: "Run db/schema.sql and db/seed.sql against your database.",
        },
        { status: 500 }
      )
    );
  }
}
