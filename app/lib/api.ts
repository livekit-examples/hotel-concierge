import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function withCors<T>(response: NextResponse<T>) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function parseIsoDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function nightsBetween(checkIn: Date | null, checkOut: Date | null) {
  if (!checkIn || !checkOut) return 2;
  const diff = checkOut.getTime() - checkIn.getTime();
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return Math.max(1, nights || 1);
}

export function seasonalMultiplier(date: Date) {
  const month = date.getMonth();
  if (month >= 5 && month <= 8) return 1.25;
  if (month === 11 || month === 0) return 1.15;
  return 1;
}
