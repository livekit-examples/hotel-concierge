"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Room } from "@/app/lib/hotel-data";

type AvailabilityItem = {
  roomId: string;
  name?: string;
  available: boolean;
  remaining: number;
  nightlyRate: number;
  total: number;
  currency: string;
  inventory: number;
};

type AvailabilityResponse = {
  checkIn: string | null;
  checkOut: string | null;
  nights: number;
  guests: number;
  availability: AvailabilityItem[];
};

type LiveHotelAction =
  | { type: "openBooking" }
  | { type: "selectRoom"; roomId: string }
  | { type: "setBookingDates"; checkIn?: string; checkOut?: string }
  | { type: "setBookingGuests"; guests: number }
  | {
      type: "setBookingContact";
      name?: string;
      email?: string;
      phone?: string;
      specialRequests?: string;
    }
  | {
      type: "setBookingAddress";
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    }
  | {
      type: "setBookingPreferences";
      arrivalTime?: string;
      bedPreference?: string;
      occasion?: string;
      accessibility?: string;
      specialRequests?: string;
    }
  | { type: "confirmBooking" }
  | { type: "checkAvailability"; roomId?: string };

type BookingResponse = {
  confirmationId: string;
};

type Props = {
  rooms: Room[];
};

type FormState = {
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  arrivalTime: string;
  bedPreference: string;
  occasion: string;
  accessibility: string;
  specialRequests: string;
};

const DEFAULT_CHECK_IN = "2026-02-12";
const DEFAULT_CHECK_OUT = "2026-02-14";

const arrivalOptions = [
  "Before 12:00 PM",
  "12:00 PM - 3:00 PM",
  "3:00 PM - 6:00 PM",
  "After 6:00 PM",
];

const bedOptions = ["King bed", "Two queens", "High floor", "Lower floor"];

const occasionOptions = ["Leisure", "Business", "Anniversary", "Celebration"];

const countryOptions = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "Other",
];

const normalizeArrivalTime = (value?: string) => {
  if (!value) return undefined;
  const directMatch = arrivalOptions.find((option) => option === value);
  if (directMatch) return directMatch;
  const normalized = value.toLowerCase();
  if (normalized.includes("before") || normalized.includes("morning")) {
    return "Before 12:00 PM";
  }
  if (
    normalized.includes("12") ||
    normalized.includes("noon") ||
    normalized.includes("midday")
  ) {
    return "12:00 PM - 3:00 PM";
  }
  if (normalized.includes("3") || normalized.includes("afternoon")) {
    return "3:00 PM - 6:00 PM";
  }
  if (normalized.includes("6") || normalized.includes("evening") || normalized.includes("after")) {
    return "After 6:00 PM";
  }
  return undefined;
};

const buildGuestNotes = (form: FormState) => {
  const address = [
    form.addressLine1,
    form.addressLine2,
    form.city,
    form.region,
    form.postalCode,
    form.country,
  ]
    .filter(Boolean)
    .join(", ");
  const notes: string[] = [];
  if (address) notes.push(`Address: ${address}`);
  if (form.arrivalTime) notes.push(`Arrival time: ${form.arrivalTime}`);
  if (form.bedPreference) notes.push(`Bed preference: ${form.bedPreference}`);
  if (form.occasion) notes.push(`Occasion: ${form.occasion}`);
  if (form.accessibility) notes.push(`Accessibility: ${form.accessibility}`);
  return notes.length > 0 ? notes.join(" | ") : undefined;
};

export default function BookingPageClient({ rooms }: Props) {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("roomId");
  const focusParam = searchParams.get("focus");
  const confirmParam = searchParams.get("confirm");
  const resolvedRoomParam =
    roomParam && rooms.some((room) => room.id === roomParam)
      ? roomParam
      : undefined;
  const hasAutoConfirmed = useRef(false);

  const [, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [, setIsCheckingAvailability] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingConfirmationId, setBookingConfirmationId] = useState<
    string | null
  >(null);
  const [autoLoadedAvailability, setAutoLoadedAvailability] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    resolvedRoomParam ?? rooms[0]?.id ?? null
  );

  const [form, setForm] = useState<FormState>({
    checkIn: DEFAULT_CHECK_IN,
    checkOut: DEFAULT_CHECK_OUT,
    guests: 2,
    name: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "United States",
    arrivalTime: "",
    bedPreference: "",
    occasion: "",
    accessibility: "",
    specialRequests: "",
  });

  useEffect(() => {
    if (!resolvedRoomParam) return;
    if (resolvedRoomParam === selectedRoomId) return;
    setSelectedRoomId(resolvedRoomParam);
  }, [resolvedRoomParam, selectedRoomId]);

  const scrollToId = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find((room) => room.id === selectedRoomId) ?? null;
  }, [rooms, selectedRoomId]);

  const validateDates = useCallback(() => {
    if (!form.checkIn || !form.checkOut) {
      setAvailabilityError("Please select both check-in and check-out dates.");
      return false;
    }
    const checkIn = new Date(form.checkIn);
    const checkOut = new Date(form.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      setAvailabilityError("Please enter valid dates.");
      return false;
    }
    if (checkOut <= checkIn) {
      setAvailabilityError("Check-out must be after check-in.");
      return false;
    }
    return true;
  }, [form.checkIn, form.checkOut]);

  const handleCheckAvailability = useCallback(
    async (roomId?: string) => {
      if (!validateDates()) {
        return;
      }

      setAvailabilityError(null);
      setIsCheckingAvailability(true);

      const params = new URLSearchParams({
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: String(form.guests || 1),
      });

      try {
        const response = await fetch(`/api/availability?${params.toString()}`);
        const data = (await response.json()) as AvailabilityResponse & {
          error?: string;
        };

        if (!response.ok) {
          setAvailabilityError(data.error ?? "Unable to load availability.");
          return;
        }

        setAvailability(data);

        if (roomId) {
          setSelectedRoomId(roomId);
        } else if (!selectedRoomId) {
          const firstAvailable = data.availability.find(
            (item) => item.available
          );
          if (firstAvailable) {
            setSelectedRoomId(firstAvailable.roomId);
          }
        }
      } catch {
        setAvailabilityError("Unable to reach the availability service.");
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [form.checkIn, form.checkOut, form.guests, selectedRoomId, validateDates]
  );

  const handleCreateBooking = useCallback(async () => {
    setBookingError(null);
    setBookingConfirmationId(null);

    if (!selectedRoomId) {
      setBookingError("Select a suite before confirming the booking.");
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setBookingError("Please provide your name and email.");
      return;
    }

    const payload = {
      roomId: selectedRoomId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guests: Number(form.guests) || 1,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      specialRequests: form.specialRequests || undefined,
      guestNotes: buildGuestNotes(form),
    };

    try {
      setIsBooking(true);
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        booking?: BookingResponse;
        error?: string;
      };

      if (!response.ok || !data.booking?.confirmationId) {
        setBookingError(data.error ?? "Unable to create booking.");
        return;
      }

      setBookingConfirmationId(data.booking.confirmationId);
      setBookingModalOpen(true);
      await handleCheckAvailability(selectedRoomId);
    } catch {
      setBookingError("Unable to reach the booking service.");
    } finally {
      setIsBooking(false);
    }
  }, [form, handleCheckAvailability, selectedRoomId]);

  useEffect(() => {
    if (autoLoadedAvailability) return;
    setAutoLoadedAvailability(true);
    void handleCheckAvailability(resolvedRoomParam);
  }, [autoLoadedAvailability, handleCheckAvailability, resolvedRoomParam]);

  useEffect(() => {
    if (focusParam !== "booking") return;
    scrollToId("booking-form");
  }, [focusParam, scrollToId]);

  useEffect(() => {
    if (hasAutoConfirmed.current) return;
    const shouldConfirm =
      confirmParam === "1" ||
      (typeof window !== "undefined" &&
        window.sessionStorage?.getItem("livehotel:pendingConfirm") === "1");

    if (!shouldConfirm) return;
    hasAutoConfirmed.current = true;
    if (typeof window !== "undefined") {
      window.sessionStorage?.removeItem("livehotel:pendingConfirm");
    }
    scrollToId("booking-form");
    void handleCreateBooking();
  }, [confirmParam, handleCreateBooking, scrollToId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LiveHotelAction>).detail;
      if (!detail) return;

      switch (detail.type) {
        case "openBooking":
          scrollToId("booking-form");
          break;
        case "selectRoom":
          scrollToId("booking-form");
          void handleCheckAvailability(detail.roomId);
          break;
        case "setBookingDates":
          setForm((prev) => ({
            ...prev,
            checkIn: detail.checkIn ?? prev.checkIn,
            checkOut: detail.checkOut ?? prev.checkOut,
          }));
          break;
        case "setBookingGuests":
          setForm((prev) => ({
            ...prev,
            guests: Math.max(1, Number(detail.guests) || 1),
          }));
          break;
        case "setBookingContact":
          setForm((prev) => ({
            ...prev,
            name: detail.name ?? prev.name,
            email: detail.email ?? prev.email,
            phone: detail.phone ?? prev.phone,
            specialRequests: detail.specialRequests ?? prev.specialRequests,
          }));
          break;
        case "setBookingAddress":
          setForm((prev) => ({
            ...prev,
            addressLine1: detail.addressLine1 ?? prev.addressLine1,
            addressLine2: detail.addressLine2 ?? prev.addressLine2,
            city: detail.city ?? prev.city,
            region: detail.region ?? prev.region,
            postalCode: detail.postalCode ?? prev.postalCode,
            country: detail.country ?? prev.country,
          }));
          break;
        case "setBookingPreferences":
          setForm((prev) => ({
            ...prev,
            arrivalTime:
              normalizeArrivalTime(detail.arrivalTime) ?? prev.arrivalTime,
            bedPreference: detail.bedPreference ?? prev.bedPreference,
            occasion: detail.occasion ?? prev.occasion,
            accessibility: detail.accessibility ?? prev.accessibility,
            specialRequests: detail.specialRequests ?? prev.specialRequests,
          }));
          break;
        case "checkAvailability":
          void handleCheckAvailability(detail.roomId ?? selectedRoomId ?? undefined);
          break;
        case "confirmBooking":
          scrollToId("booking-form");
          void handleCreateBooking();
          break;
        default:
          break;
      }
    };

    window.addEventListener("livehotel:action", handler as EventListener);
    return () => {
      window.removeEventListener("livehotel:action", handler as EventListener);
    };
  }, [handleCheckAvailability, handleCreateBooking, scrollToId, selectedRoomId]);

  useEffect(() => {
    if (!bookingModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [bookingModalOpen]);

  const closeBookingModal = useCallback(() => {
    setBookingModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen px-6 pb-24 pt-10 sm:px-10 lg:px-16">
      <header className="mx-auto max-w-5xl">
        <h1 className="font-display text-4xl text-ink">
          {selectedRoom ? selectedRoom.name : "Suite booking"}
        </h1>
      </header>

      <section className="mx-auto mt-8 max-w-5xl">
        <div
          id="booking-form"
          className="rounded-[32px] bg-[#1c2622] px-6 py-6 text-cloud shadow-[0_25px_70px_rgba(10,16,14,0.35)] md:px-8"
        >
          <div className="mt-2 grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  Stay details
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Check-in
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="date"
                      value={form.checkIn}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, checkIn: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Check-out
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="date"
                      value={form.checkOut}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, checkOut: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Guests
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="number"
                      min={1}
                      value={form.guests}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          guests: Math.max(1, Number(event.target.value) || 1),
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Arrival time
                    <select
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-[#24312d] px-4 py-3 text-sm text-cloud"
                      value={form.arrivalTime}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          arrivalTime: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {arrivalOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {availabilityError && (
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-terracotta">
                    {availabilityError}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  Guest details
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Full name
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Email
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Phone
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  Address
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70 sm:col-span-2">
                    Address line 1
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.addressLine1}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          addressLine1: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70 sm:col-span-2">
                    Address line 2
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.addressLine2}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          addressLine2: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    City
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.city}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, city: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    State / Region
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.region}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, region: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Postal code
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.postalCode}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          postalCode: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Country
                    <select
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-[#24312d] px-4 py-3 text-sm text-cloud"
                      value={form.country}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, country: event.target.value }))
                      }
                    >
                      {countryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  Preferences
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Bed preference
                    <select
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-[#24312d] px-4 py-3 text-sm text-cloud"
                      value={form.bedPreference}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          bedPreference: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {bedOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Occasion
                    <select
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-[#24312d] px-4 py-3 text-sm text-cloud"
                      value={form.occasion}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, occasion: event.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      {occasionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70 sm:col-span-2">
                    Accessibility needs
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      type="text"
                      value={form.accessibility}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          accessibility: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-amber-100/70 sm:col-span-2">
                    Special requests
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-cloud"
                      rows={3}
                      value={form.specialRequests}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          specialRequests: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-cloud shadow-[0_18px_45px_rgba(199,107,79,0.45)] transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={handleCreateBooking}
            disabled={isBooking}
          >
            {isBooking ? "Confirming..." : "Confirm booking"}
          </button>

          {bookingError && (
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-terracotta">
              {bookingError}
            </p>
          )}
        </div>
      </section>

      {bookingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 py-6"
          onClick={closeBookingModal}
        >
          <div
            className="w-full max-w-lg rounded-[32px] border border-ink/10 bg-cloud p-8 shadow-[0_30px_80px_rgba(15,15,15,0.35)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            aria-describedby="booking-confirmation-body"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-sage">
              Reservation confirmed
            </p>
            <h3
              id="booking-confirmation-title"
              className="mt-2 font-display text-3xl text-ink"
            >
              Your stay is booked
            </h3>
            <p
              id="booking-confirmation-body"
              className="mt-4 text-sm text-sage"
            >
              Reservation confirmed. Confirmation ID:{" "}
              <span className="font-semibold text-ink">
                {bookingConfirmationId ?? "AUR-XXXXXXX"}
              </span>
            </p>
            <p className="mt-3 text-sm text-sage">
              A confirmation email has been sent to {form.email || "your inbox"}.
            </p>
            <button
              type="button"
              onClick={closeBookingModal}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cloud"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
