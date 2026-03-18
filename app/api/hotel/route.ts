import { NextResponse } from "next/server";
import {
  amenities,
  experiences,
  hotel,
  packages,
  testimonials,
} from "@/app/lib/hotel-data";
import { handleOptions, withCors } from "@/app/lib/api";

export function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  return withCors(
    NextResponse.json({
      hotel,
      amenities,
      experiences,
      packages,
      testimonials,
    })
  );
}
