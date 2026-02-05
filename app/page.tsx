import BoutiqueHotelClient from "@/app/components/BoutiqueHotelClient";
import {
  amenities,
  experiences,
  hotel,
  packages,
  rooms,
  testimonials,
} from "@/app/lib/hotel-data";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f1e8]" />}>
      <BoutiqueHotelClient
        initialData={{ hotel, amenities, experiences, packages, testimonials, rooms }}
      />
    </Suspense>
  );
}
