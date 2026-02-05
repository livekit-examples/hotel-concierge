import { NextResponse } from "next/server";
import { handleOptions, withCors } from "@/app/lib/api";
import { query } from "@/app/lib/db";

export function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const result = await query<{
      id: number;
      full_name: string;
      email: string;
      phone: string | null;
      notes: string | null;
      created_at: string;
    }>(
      `SELECT id, full_name, email, phone, notes, created_at
       FROM guests
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const guests = result.rows.map((guest) => ({
      id: guest.id,
      name: guest.full_name,
      email: guest.email,
      phone: guest.phone,
      notes: guest.notes,
      createdAt: guest.created_at,
    }));

    return withCors(
      NextResponse.json({
        count: guests.length,
        guests,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Guests table not initialized.",
          hint: "Run db/schema.sql against your database.",
        },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  const missing: string[] = [];
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

  try {
    const result = await query<{
      id: number;
      full_name: string;
      email: string;
      phone: string | null;
      notes: string | null;
      created_at: string;
    }>(
      `INSERT INTO guests (full_name, email, phone, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET full_name = EXCLUDED.full_name,
                     phone = COALESCE(EXCLUDED.phone, guests.phone),
                     notes = COALESCE(EXCLUDED.notes, guests.notes)
       RETURNING id, full_name, email, phone, notes, created_at`,
      [payload.name, payload.email, payload.phone ?? null, payload.notes ?? null]
    );

    const guest = result.rows[0];

    return withCors(
      NextResponse.json(
        {
          guest: {
            id: guest.id,
            name: guest.full_name,
            email: guest.email,
            phone: guest.phone,
            notes: guest.notes,
            createdAt: guest.created_at,
          },
        },
        { status: 201 }
      )
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Unable to create guest.",
          hint: "Confirm that db/schema.sql has been applied.",
        },
        { status: 500 }
      )
    );
  }
}
