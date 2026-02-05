import BoutiqueHotelClient from "@/app/components/BoutiqueHotelClient";
import {
  amenities,
  experiences,
  hotel,
  packages,
  rooms,
  testimonials,
} from "@/app/lib/hotel-data";

export default function Home() {
  return (
    <BoutiqueHotelClient
      initialData={{ hotel, amenities, experiences, packages, testimonials, rooms }}
    />
  );
}
