# LiveKit Site Widget — Voice AI Agent with Direct Page Control

A complete example of a **drop-in voice AI widget** that controls a website via direct DOM manipulation — no custom page code required. The agent navigates pages, fills forms, scrolls, clicks buttons, and completes bookings, all through a single `<script>` tag.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│                                                                     │
│  ┌───────────────────────────────────────────┐  ┌────────────────┐  │
│  │  Hotel Website (Next.js)                  │  │  Embed Widget  │  │
│  │                                           │  │  (Shadow DOM)  │  │
│  │  Standard pages, forms, buttons.          │  │                │  │
│  │  No agent-specific code.                  │  │  Voice UI,     │  │
│  │                                           │  │  RPC handlers, │  │
│  │  Loaded via one <script> tag:             │  │  DOM control   │  │
│  │  <Script src="/embed-popup.js" />         │──│                │  │
│  │                                           │  └───────┬────────┘  │
│  └───────────────────────────────────────────┘          │           │
│         ▲  DOM manipulation                             │           │
│         │  (querySelector, native setters,              │           │
│         │   button.click, window.next.router)           │           │
│         └───────────────────────────────────────────────┘           │
│                                    ▲                                │
│                                    │ LiveKit RPC                    │
│                                    │ (WebRTC data channel)          │
└────────────────────────────────────┼────────────────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  Python Voice Agent    │
                        │                        │
                        │  STT → LLM → TTS       │
                        │  + 11 function tools   │
                        │  that call RPC methods  │
                        └────────────────────────┘
```

## How the Agent Controls the Page

The widget runs inside a Shadow DOM in the same document as the host page. It receives RPC calls from the Python agent over LiveKit's WebRTC data channel, then manipulates the page directly:

### Navigation

```
Agent calls hotel_navigate("/suites/harbor-suite")
  → Python: room.local_participant.perform_rpc("hotel.navigate", ...)
    → Widget: window.next.router.push("/suites/harbor-suite")
      → Next.js client-side route change (no page reload)
```

Next.js exposes `window.next.router` globally after hydration. The widget calls `router.push()` / `router.replace()` for client-side navigation, keeping the widget and LiveKit connection alive.

### Form Filling

```
Agent calls hotel_set_booking_contact(name="Avery", email="avery@example.com")
  → Python: room.local_participant.perform_rpc("hotel.set_booking_contact", ...)
    → Widget finds <input> by label text ("Full name", "Email")
    → Sets value via native property setter (bypasses React)
    → Dispatches 'input' event (React picks up the change)
      → React state updates as if the user typed it
```

React-controlled inputs ignore direct `.value` assignment. The widget uses the same technique as Playwright/Puppeteer:

```typescript
const nativeSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, 'value'
).set;
nativeSetter.call(inputElement, 'Avery');
inputElement.dispatchEvent(new Event('input', { bubbles: true }));
```

React's delegated event system picks up the bubbling `input` event and runs the `onChange` handler, updating component state.

### Button Clicks & Scrolling

```
Agent calls hotel_confirm_booking()
  → Widget: document.querySelector('#booking-form button').click()

Agent calls hotel_scroll_to(element_id="booking-form")
  → Widget: document.getElementById('booking-form').scrollIntoView()
```

### Finding Form Fields

The widget locates inputs by their label text within `#booking-form`:

```typescript
// Walks all <label> elements, matches by text content
const label = findLabelByText('Check-in');  // finds <label>Check-in<input type="date"></label>
const input = label.querySelector('input'); // gets the <input> inside it
```

This is resilient to CSS class changes but depends on label text staying stable.

## RPC Methods

All 11 methods the Python agent can call:

| Method | Payload | Widget Action |
|--------|---------|---------------|
| `hotel.scroll_to` | `{ id, y, behavior }` | `element.scrollIntoView()` or `window.scrollTo()` |
| `hotel.navigate` | `{ path, replace }` | `window.next.router.push(path)` |
| `hotel.open_booking` | `{}` | Navigate to `/booking?focus=booking` |
| `hotel.select_room` | `{ roomId }` | Navigate to `/booking?roomId=X&focus=booking` |
| `hotel.set_booking_dates` | `{ checkIn, checkOut }` | Set date inputs via native setter |
| `hotel.set_booking_guests` | `{ guests }` | Set number input via native setter |
| `hotel.set_booking_contact` | `{ name, email, phone, specialRequests }` | Set text inputs via native setter |
| `hotel.set_booking_address` | `{ addressLine1, ..., country }` | Set text inputs + select via native setter |
| `hotel.set_booking_preferences` | `{ arrivalTime, bedPreference, occasion, ... }` | Set selects + inputs, normalize arrival time |
| `hotel.confirm_booking` | `{}` | Click the submit button, or navigate with `?confirm=1` |
| `hotel.check_availability` | `{ roomId }` | Fetch `/api/availability` directly, return data |

## Project Structure

```
├── app/                          # Next.js hotel website (standard, no agent code)
│   ├── layout.tsx                #   only adds <Script src="/embed-popup.js" />
│   ├── booking/                  #   booking page with standard React form
│   ├── api/
│   │   ├── connection-details/   #   issues LiveKit tokens
│   │   ├── availability/         #   room availability API
│   │   └── bookings/             #   booking creation API
│   └── ...                       #   rooms, dining, amenities pages
│
├── livehotel-embed-agent/        # Widget (builds to embed-popup.js)
│   ├── components/embed-popup/
│   │   ├── agent-client.tsx      #   RPC handlers + DOM manipulation logic
│   │   └── standalone-bundle-root.tsx  # mounts widget in Shadow DOM
│   ├── hooks/
│   │   └── use-connection-details.ts   # fetches LiveKit tokens
│   └── webpack.config.js        #   builds standalone bundle
│
├── livehotel-agent/              # Python voice agent
│   └── src/agent.py              #   LLM + 11 function tools → RPC calls
│
├── db/                           # PostgreSQL schema + seed data
│   ├── schema.sql
│   └── seed.sql
│
└── public/
    └── embed-popup.js            # compiled widget bundle (from webpack)
```

## Quick Start

### 1. Database

```bash
# Create a PostgreSQL database and set the connection string
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and LiveKit credentials

psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

### 2. Hotel Website

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 3. Widget

```bash
cd livehotel-embed-agent
cp .env.example .env.local
# Edit .env.local with LiveKit credentials

pnpm install
pnpm build-embed-popup-script
cp public/embed-popup.js ../public/embed-popup.js
```

### 4. Python Agent

```bash
cd livehotel-agent
cp .env.example .env.local
# Edit .env.local with LiveKit credentials

uv sync
uv run python src/agent.py dev
```

Open http://localhost:3000, click the concierge button, and start talking.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `.env.local` (root) | PostgreSQL connection string |
| `LIVEKIT_API_KEY` | `.env.local` (root + agent) | LiveKit API key |
| `LIVEKIT_API_SECRET` | `.env.local` (root + agent) | LiveKit API secret |
| `LIVEKIT_URL` | `.env.local` (root + agent) | LiveKit server URL (`wss://...`) |
| `ADMIN_USER` | `.env.local` (root) | Admin panel username |
| `ADMIN_PASSWORD` | `.env.local` (root) | Admin panel password |

The widget's `NEXT_PUBLIC_CONN_DETAILS_ENDPOINT` is intentionally **not set** — it defaults to the host page's `/api/connection-details` route, so it works on any port or domain automatically.

## Key Design Decisions

**Why direct DOM manipulation instead of a page bridge?**
The widget works with any page without requiring custom event listeners, global objects, or React context sharing. Drop in the `<script>` tag and the agent can control the page.

**Why `window.next.router` for navigation?**
Next.js exposes this global after hydration. Using it gives proper client-side navigation (route data fetching, component re-rendering) without a full page reload, which would kill the LiveKit connection and close the widget.

**Why native property setters for form inputs?**
React ignores direct `.value` assignment on controlled inputs. The native setter + `input` event dispatch is the same technique browser automation tools use — React's delegated event handler picks up the bubbling event and updates state normally.

**Why Shadow DOM for the widget?**
CSS isolation. The widget's styles don't leak into the host page, and the host page's styles don't affect the widget. JavaScript still has full access to the main document via `document.querySelector()` etc.

## Voice Pipeline

```
User speaks
  → Microphone (WebRTC via LiveKit)
    → STT: AssemblyAI streaming
      → LLM: OpenAI GPT-4.1 mini (with function tools)
        → If tool call: perform_rpc() → widget → DOM
        → TTS: ElevenLabs Eleven Turbo v2.5
          → Speaker (WebRTC via LiveKit)
```

The agent uses LiveKit's voice pipeline with:
- **Turn detection**: LiveKit Multilingual Model
- **VAD**: Silero (prewarmed for fast startup)
- **Noise cancellation**: LiveKit noise cancellation plugin
- **Preemptive generation**: Enabled for lower latency
