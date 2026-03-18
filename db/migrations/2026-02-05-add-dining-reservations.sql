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

CREATE INDEX IF NOT EXISTS dining_reservations_venue_date_idx
  ON dining_reservations (venue, reservation_date);
