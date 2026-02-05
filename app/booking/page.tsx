import BookingPageClient from "@/app/booking/BookingPageClient";
import { query } from "@/app/lib/db";
import { rooms as fallbackRooms, type Room } from "@/app/lib/hotel-data";

type RoomRow = {
  id: string;
  name: string;
  description: string;
  size_sqm: number;
  beds: string;
  occupancy: number;
  view: string;
  base_rate: number;
  inventory: number;
};

export default async function BookingPage() {
  const result = await query<RoomRow>(
    `SELECT id, name, description, size_sqm, beds, occupancy, view, base_rate, inventory
     FROM rooms
     ORDER BY base_rate DESC`
  );

  const roomRows =
    result.rows.length > 0
      ? result.rows
      : fallbackRooms.map((room) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          size_sqm: room.sizeSqm,
          beds: room.beds,
          occupancy: room.occupancy,
          view: room.view,
          base_rate: room.baseRate,
          inventory: room.inventory,
        }));

  const amenityLookup = new Map(
    fallbackRooms.map((room) => [room.id, room.amenities ?? []])
  );

  const rooms: Room[] = roomRows.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    sizeSqm: room.size_sqm,
    beds: room.beds,
    occupancy: room.occupancy,
    view: room.view,
    baseRate: room.base_rate,
    inventory: room.inventory,
    amenities: amenityLookup.get(room.id) ?? [],
  }));

  return <BookingPageClient rooms={rooms} />;
}
