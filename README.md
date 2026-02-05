# Aurum Atelier Boutique Hotel (Next.js)

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Create the database schema (drops/recreates demo tables)

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

3. Seed the sample rooms (clears bookings, blocks, guests, and rooms for a clean demo)

```bash
psql "$DATABASE_URL" -f db/seed.sql
```

4. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment

Set `DATABASE_URL` in `.env.local`.
Set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env.local` to protect `/admin`.
Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` in `.env.local`
to enable the embedded concierge agent. Optionally set
`NEXT_PUBLIC_LIVEKIT_SANDBOX_ID` if you want a specific sandbox id.

## API Actions

- `GET /api/hotel` returns hotel profile, amenities, experiences, packages, testimonials
- `GET /api/rooms` returns all room types from Postgres
- `GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2` returns pricing and inventory
- `GET /api/guests` returns recent guests
- `POST /api/guests` creates or updates a guest by email
- `GET /api/blocks?roomId=ROOM_ID&from=YYYY-MM-DD&to=YYYY-MM-DD` returns availability holds
- `POST /api/blocks` creates an availability hold
- `GET /api/bookings` returns recent bookings (includes guest + room info)
- `POST /api/bookings` creates a booking
- `GET /api/dining/reservations?venue=VENUE&date=YYYY-MM-DD` returns dining reservations
- `POST /api/dining/reservations` creates a dining reservation
- `POST /api/connection-details` issues LiveKit connection details for the concierge embed

## Admin

Visit `/admin` and authenticate with the `ADMIN_USER` and `ADMIN_PASSWORD`.

## Gallery Assets

Place generated PNGs under `public/images/` and keep filenames aligned with
`app/lib/media.ts`.

## LiveKit Concierge Embed

The embedded concierge button is powered by the `livehotel-embed-agent` example.
To rebuild the popup bundle:

```bash
cd livehotel-embed-agent
npm run build-embed-popup-script
cp public/embed-popup.js ../public/embed-popup.js
```

If you deploy the hotel app somewhere other than `http://localhost:3000`,
set `NEXT_PUBLIC_CONN_DETAILS_ENDPOINT` in
`livehotel-embed-agent/.env.local` before building so the bundle points to the
correct domain.

### LiveKit RPC controls

The embed registers RPC methods for browser/UI control. Payloads are JSON strings.

- `hotel.scroll_to` `{ "id": "booking", "behavior": "smooth" }` or `{ "y": 400 }`
- `hotel.navigate` `{ "path": "/rooms", "replace": false }`
- `hotel.open_booking` `{}`
- `hotel.select_room` `{ "roomId": "harbor-suite" }`
- `hotel.set_booking_dates` `{ "checkIn": "2026-02-12", "checkOut": "2026-02-14" }`
- `hotel.set_booking_guests` `{ "guests": 2 }`
- `hotel.set_booking_contact` `{ "name": "Avery", "email": "avery@example.com" }`
- `hotel.set_booking_address` `{ "addressLine1": "18 Meridian Quay", "city": "Seaport City", "region": "CA", "postalCode": "94110", "country": "United States" }`
- `hotel.set_booking_preferences` `{ "arrivalTime": "3:00 PM - 6:00 PM", "bedPreference": "King bed", "occasion": "Leisure" }`
- `hotel.confirm_booking` `{}`
- `hotel.check_availability` `{ "roomId": "harbor-suite" }`

## Notes

The booking endpoints write to the `bookings` table defined in `db/schema.sql`.
`POST /api/bookings` accepts an optional `guestNotes` string, which is stored on
the guest profile for concierge visibility.
