import { NextResponse } from "next/server";
import { handleOptions, parseIsoDate, withCors } from "@/app/lib/api";
import { query } from "@/app/lib/db";

export function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  const from = parseIsoDate(searchParams.get("from"));
  const to = parseIsoDate(searchParams.get("to"));

  const conditions: string[] = [];
  const params: Array<string> = [];

  if (roomId) {
    params.push(roomId);
    conditions.push(`room_id = $${params.length}`);
  }

  if (from && to) {
    params.push(from.toISOString().slice(0, 10));
    conditions.push(`start_date < $${params.length}::date`);
    params.push(to.toISOString().slice(0, 10));
    conditions.push(`end_date > $${params.length}::date`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query<{
      id: number;
      room_id: string;
      start_date: string;
      end_date: string;
      reason: string | null;
      created_at: string;
    }>(
      `SELECT id, room_id, start_date, end_date, reason, created_at
       FROM availability_blocks
       ${whereClause}
       ORDER BY start_date ASC
       LIMIT 100`,
      params
    );

    const blocks = result.rows.map((block) => ({
      id: block.id,
      roomId: block.room_id,
      startDate: block.start_date,
      endDate: block.end_date,
      reason: block.reason,
      createdAt: block.created_at,
    }));

    return withCors(
      NextResponse.json({
        count: blocks.length,
        blocks,
      })
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Availability blocks not initialized.",
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
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  const missing: string[] = [];
  if (!payload.roomId?.trim()) missing.push("roomId");
  if (!payload.startDate?.trim()) missing.push("startDate");
  if (!payload.endDate?.trim()) missing.push("endDate");

  if (missing.length > 0) {
    return withCors(
      NextResponse.json(
        { error: "Missing required fields", missing },
        { status: 400 }
      )
    );
  }

  const startDate = parseIsoDate(payload.startDate ?? null);
  const endDate = parseIsoDate(payload.endDate ?? null);

  if (!startDate || !endDate) {
    return withCors(
      NextResponse.json(
        { error: "Invalid startDate or endDate." },
        { status: 400 }
      )
    );
  }

  if (endDate <= startDate) {
    return withCors(
      NextResponse.json(
        { error: "endDate must be after startDate." },
        { status: 400 }
      )
    );
  }

  try {
    const result = await query<{
      id: number;
      room_id: string;
      start_date: string;
      end_date: string;
      reason: string | null;
      created_at: string;
    }>(
      `INSERT INTO availability_blocks (room_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, room_id, start_date, end_date, reason, created_at`,
      [
        payload.roomId,
        payload.startDate,
        payload.endDate,
        payload.reason ?? null,
      ]
    );

    const block = result.rows[0];

    return withCors(
      NextResponse.json(
        {
          block: {
            id: block.id,
            roomId: block.room_id,
            startDate: block.start_date,
            endDate: block.end_date,
            reason: block.reason,
            createdAt: block.created_at,
          },
        },
        { status: 201 }
      )
    );
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: "Unable to create block.",
          hint: "Confirm that db/schema.sql has been applied.",
        },
        { status: 500 }
      )
    );
  }
}
