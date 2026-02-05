TRUNCATE booking_rooms, bookings, availability_blocks, dining_reservations, guests, rooms RESTART IDENTITY;

INSERT INTO rooms (id, name, description, size_sqm, beds, occupancy, view, base_rate, inventory)
VALUES
  (
    'harbor-suite',
    'Harbor Suite',
    'Corner suite with panoramic windows, hand-finished oak floors, and a private bar cart.',
    54,
    'King bed',
    2,
    'Harbor skyline',
    520,
    6
  ),
  (
    'gallery-loft',
    'Gallery Loft',
    'A light-filled loft with curated art, matte brass fixtures, and a deep soaking tub.',
    48,
    'King bed',
    2,
    'Courtyard gardens',
    460,
    8
  ),
  (
    'terrace-residence',
    'Terrace Residence',
    'Indoor-outdoor suite with a private terrace, lounge seating, and custom minibar.',
    58,
    'King bed',
    3,
    'Rooftop terrace',
    560,
    4
  ),
  (
    'lighthouse-penthouse',
    'Lighthouse Penthouse',
    'Two-level penthouse with panoramic windows, dining salon, and a skyline terrace.',
    92,
    'King bed',
    4,
    'Coastal panorama',
    980,
    1
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  size_sqm = EXCLUDED.size_sqm,
  beds = EXCLUDED.beds,
  occupancy = EXCLUDED.occupancy,
  view = EXCLUDED.view,
  base_rate = EXCLUDED.base_rate,
  inventory = EXCLUDED.inventory;
