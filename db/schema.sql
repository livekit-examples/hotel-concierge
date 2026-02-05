-- WARNING: This schema drops and recreates demo tables.
DROP TABLE IF EXISTS booking_rooms;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS guests;
DROP TABLE IF EXISTS availability_blocks;
DROP TABLE IF EXISTS dining_reservations;
DROP TABLE IF EXISTS rooms;

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  size_sqm INTEGER NOT NULL,
  beds TEXT NOT NULL,
  occupancy INTEGER NOT NULL,
  view TEXT NOT NULL,
  base_rate INTEGER NOT NULL,
  inventory INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guests (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  confirmation_id TEXT UNIQUE NOT NULL,
  guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_rooms (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  nightly_rate INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dining_reservations (
  id BIGSERIAL PRIMARY KEY,
  confirmation_id TEXT UNIQUE NOT NULL,
  venue TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rooms_inventory_idx ON rooms (inventory);
CREATE INDEX IF NOT EXISTS bookings_check_in_out_idx ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS booking_rooms_booking_id_idx ON booking_rooms (booking_id);
CREATE INDEX IF NOT EXISTS availability_blocks_room_date_idx
  ON availability_blocks (room_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS dining_reservations_venue_date_idx
  ON dining_reservations (venue, reservation_date);
