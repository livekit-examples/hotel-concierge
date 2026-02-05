"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Amenity,
  Experience,
  Hotel,
  PackageOffer,
  Room,
  Testimonial,
} from "@/app/lib/hotel-data";
import { galleryItems, roomMedia } from "@/app/lib/media";

const roomGradients = [
  "bg-[radial-gradient(circle_at_top,_#e7c6a5,_#b96a4f_55%,_#7a3f2d_100%)]",
  "bg-[radial-gradient(circle_at_top,_#cfe0d7,_#6d8e80_55%,_#2a3d38_100%)]",
  "bg-[radial-gradient(circle_at_top,_#f0e5d6,_#d0b28a_55%,_#826145_100%)]",
];

type HotelPayload = {
  hotel: Hotel;
  amenities: Amenity[];
  experiences: Experience[];
  packages: PackageOffer[];
  testimonials: Testimonial[];
};

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
  | { type: "confirmBooking" }
  | { type: "checkAvailability"; roomId?: string };

type BookingResponse = {
  confirmationId: string;
};

type Props = {
  initialData: HotelPayload & { rooms: Room[] };
};

const DEFAULT_CHECK_IN = "2026-02-12";
const DEFAULT_CHECK_OUT = "2026-02-14";

export default function BoutiqueHotelClient({ initialData }: Props) {
  const [hotelData, setHotelData] = useState<HotelPayload>({
    hotel: initialData.hotel,
    amenities: initialData.amenities,
    experiences: initialData.experiences,
    packages: initialData.packages,
    testimonials: initialData.testimonials,
  });
  const [rooms, setRooms] = useState<Room[]>(initialData.rooms);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null
  );
  const [autoLoadedAvailability, setAutoLoadedAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null
  );
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingConfirmationId, setBookingConfirmationId] = useState<
    string | null
  >(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const searchParams = useSearchParams();
  const roomParam = searchParams.get("roomId");
  const router = useRouter();

  const [form, setForm] = useState({
    checkIn: DEFAULT_CHECK_IN,
    checkOut: DEFAULT_CHECK_OUT,
    guests: 2,
    name: "",
    email: "",
    phone: "",
    specialRequests: "",
  });

  const refreshHotelData = useCallback(async () => {
    try {
      const response = await fetch("/api/hotel");
      if (!response.ok) {
        throw new Error("Failed to load hotel data");
      }
      const data = (await response.json()) as HotelPayload;
      setHotelData(data);
    } catch {
      // fall back to initial data
    }
  }, []);

  const refreshRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms");
      if (!response.ok) {
        throw new Error("Failed to load rooms");
      }
      const data = (await response.json()) as { rooms: Room[] };
      setRooms(data.rooms);
    } catch {
      // fall back to initial data
    }
  }, []);

  useEffect(() => {
    void refreshHotelData();
    void refreshRooms();
  }, [refreshHotelData, refreshRooms]);

  const scrollToId = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const featuredRooms = useMemo(() => rooms, [rooms]);

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
      setAvailabilityMessage("Checking availability...");
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
          setAvailabilityMessage(null);
          return;
        }

        setAvailability(data);
        const availableCount = data.availability.filter(
          (item) => item.available
        ).length;
        setAvailabilityMessage(
          `${availableCount} suites available for ${data.nights} night${
            data.nights === 1 ? "" : "s"
          }.`
        );

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
        setAvailabilityMessage(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    },
    [form.checkIn, form.checkOut, form.guests, selectedRoomId, validateDates]
  );

  useEffect(() => {
    if (autoLoadedAvailability) return;
    setAutoLoadedAvailability(true);
    void handleCheckAvailability(roomParam ?? undefined);
    if (roomParam) {
      scrollToId("booking");
    }
  }, [autoLoadedAvailability, handleCheckAvailability, roomParam, scrollToId]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LiveHotelAction>).detail;
      if (!detail) return;

      switch (detail.type) {
        case "openBooking":
          scrollToId("booking");
          break;
        case "selectRoom":
          scrollToId("booking");
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
        case "checkAvailability":
          void handleCheckAvailability(detail.roomId ?? selectedRoomId ?? undefined);
          break;
        case "confirmBooking":
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
  }, [handleCheckAvailability, scrollToId, selectedRoomId]);

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

  useEffect(() => {
    if (!bookingModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBookingModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bookingModalOpen]);

  const handleCreateBooking = useCallback(async () => {
    setBookingError(null);
    setBookingConfirmationId(null);

    if (!selectedRoomId) {
      setBookingError("Select a suite from availability results.");
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
  }, [
    form.checkIn,
    form.checkOut,
    form.email,
    form.guests,
    form.name,
    form.phone,
    form.specialRequests,
    handleCheckAvailability,
    selectedRoomId,
  ]);

  const handlePrimaryAvailability = useCallback(() => {
    router.push("/booking");
  }, [router]);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find((room) => room.id === selectedRoomId) ?? null;
  }, [rooms, selectedRoomId]);

  const stats = [
    { label: "Suites", value: rooms.length.toString() },
    { label: "Amenities", value: hotelData.amenities.length.toString() },
    { label: "Experiences", value: hotelData.experiences.length.toString() },
    { label: "Dining venues", value: "2" },
  ];
  const heroRoomMedia = roomMedia["harbor-suite"]?.hero ?? galleryItems[0];
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 pt-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta text-cloud">
            <span className="font-display text-xl">A</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sage">
              Aurum Atelier
            </p>
            <p className="font-display text-lg">Boutique Hotel</p>
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-sage lg:flex">
          <Link className="transition hover:text-ink" href="/rooms">
            Suites
          </Link>
          <Link className="transition hover:text-ink" href="/experiences">
            Experiences
          </Link>
          <Link className="transition hover:text-ink" href="/booking">
            Booking
          </Link>
          <Link className="transition hover:text-ink" href="/#api">
            API
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <button
            className="hidden rounded-full border border-ink/15 px-4 py-2 text-sm transition hover:border-ink/40 sm:inline-flex"
            type="button"
            onClick={handlePrimaryAvailability}
          >
            Check availability
          </button>
          <button
            className="rounded-full bg-ink px-5 py-2 text-sm text-cloud transition hover:bg-ink/90"
            type="button"
            onClick={handlePrimaryAvailability}
          >
            Book stay
          </button>
        </div>
      </header>

      <main className="px-6 pb-24 pt-6 sm:px-10 lg:px-16">
        <section className="relative mt-6 overflow-hidden rounded-[36px] bg-[#172522] text-cloud shadow-[0_30px_90px_rgba(23,37,34,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_55%)]" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(199,107,79,0.65),_transparent_65%)]" />
          <div className="relative z-10 grid gap-10 px-8 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-12">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-amber-100/70">
                {hotelData.hotel.location}
              </p>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                {hotelData.hotel.tagline}
              </h1>
              <p className="max-w-xl text-base text-amber-100/80 sm:text-lg">
                A private, design-forward stay inspired by the harbor. Suites with
                curated art, rooftop rituals, and a concierge that knows every
                corner.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  className="rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-cloud shadow-[0_18px_45px_rgba(199,107,79,0.45)]"
                  type="button"
                  onClick={handlePrimaryAvailability}
                >
                  Reserve a suite
                </button>
                <Link
                  className="rounded-full border border-cloud/40 px-6 py-3 text-sm font-semibold text-cloud transition hover:border-cloud"
                  href="/experiences"
                >
                  Explore experiences
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-amber-100/75">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]">Rating</p>
                  <p className="text-lg text-cloud">
                    {hotelData.hotel.rating} / 5 ({hotelData.hotel.reviewCount} reviews)
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]">Check-in</p>
                  <p className="text-lg text-cloud">{hotelData.hotel.checkIn}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em]">Check-out</p>
                  <p className="text-lg text-cloud">{hotelData.hotel.checkOut}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_20px_50px_rgba(10,16,14,0.35)]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1916]/80 via-transparent to-transparent" />
                <Image
                  src={heroRoomMedia.src}
                  alt={heroRoomMedia.alt}
                  className="h-[320px] w-full object-cover"
                  width={720}
                  height={640}
                  priority
                />
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 pb-5 pt-12 text-cloud">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                      Featured suite
                    </p>
                    <p className="mt-2 font-display text-2xl">Harbor Suite</p>
                  </div>
                  <Link
                    className="rounded-full border border-cloud/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cloud transition hover:border-cloud"
                    href="/suites/harbor-suite"
                  >
                    View suite
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  Concierge
                </p>
                <p className="mt-3 text-lg font-display text-cloud">
                  {hotelData.hotel.address}
                </p>
                <p className="mt-2 text-sm text-amber-100/70">
                  <a className="hover:text-cloud" href={`tel:${hotelData.hotel.phone}`}>
                    {hotelData.hotel.phone}
                  </a>{" "}
                  ·{" "}
                  <a
                    className="hover:text-cloud"
                    href={`mailto:${hotelData.hotel.email}`}
                  >
                    {hotelData.hotel.email}
                  </a>
                </p>
                <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-amber-100/70">
                  <span>Private transfers</span>
                  <span>Rooftop aperitif</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-ink/10 bg-cloud/80 px-6 py-5 text-center shadow-[0_20px_50px_rgba(44,45,39,0.08)]"
            >
              <p className="font-display text-3xl text-ink">{stat.value}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-sage">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        <section id="suites" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sage">
                Suites & rooms
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">
                Retreats designed for stillness
              </h2>
            </div>
            <p className="max-w-xl text-sm text-sage">
              Each space layers warm textures, quiet lighting, and custom art
              pieces that reflect the harbor beyond your windows.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {featuredRooms.map((room, index) => (
              <div
                key={room.id}
                className="overflow-hidden rounded-[28px] border border-ink/10 bg-cloud shadow-[0_22px_60px_rgba(44,45,39,0.12)]"
              >
                <div className="relative h-48 w-full">
                  {roomMedia[room.id]?.hero ? (
                    <Image
                      src={roomMedia[room.id].hero.src}
                      alt={roomMedia[room.id].hero.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                  ) : (
                    <div
                      className={`${roomGradients[index % roomGradients.length]} h-full w-full`}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="space-y-4 px-6 pb-6 pt-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-sage">
                    <span>{room.sizeSqm} sqm</span>
                    <span>{room.view}</span>
                  </div>
                  <h3 className="font-display text-2xl text-ink">
                    {room.name}
                  </h3>
                  <p className="text-sm text-sage">{room.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-ink">
                      From <span className="text-lg">${room.baseRate}</span> / night
                    </p>
                    <Link
                      className="rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:border-ink/60"
                      href={`/suites/${room.id}`}
                    >
                      View suite
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="gallery" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sage">
                Gallery
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">
                A closer look at the hotel
              </h2>
            </div>
            <p className="max-w-xl text-sm text-sage">
              Explore suites, wellness, and dining spaces with a real-world
              preview of the experience.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {galleryItems.map((item) => (
              <Link
                key={item.label}
                href={item.href ?? "/"}
                className="group rounded-[28px] border border-ink/10 bg-cloud/90 p-4 shadow-[0_22px_60px_rgba(44,45,39,0.12)] transition hover:-translate-y-1 hover:border-ink/30"
              >
                <div className="relative h-48 overflow-hidden rounded-[22px]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-sage">
                  <span>{item.label}</span>
                  <span className="text-terracotta">View</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="experiences"
          className="mt-20 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[32px] border border-ink/10 bg-cloud px-8 py-10 shadow-[0_25px_70px_rgba(44,45,39,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sage">
                  Experiences
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                  Crafted moments for every stay
                </h2>
              </div>
              <Link
                className="rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink transition hover:border-ink/60"
                href="/experiences"
              >
                View all
              </Link>
            </div>
            <p className="mt-4 text-sm text-sage">
              Concierge-led itineraries connect you to artisans, chefs, and the
              people who make this neighborhood shimmer.
            </p>
            <div className="mt-8 space-y-5">
              {hotelData.experiences.map((experience) => (
                <div
                  key={experience.title}
                  className="rounded-2xl border border-ink/10 bg-white/60 px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-ink">
                      {experience.title}
                    </h3>
                    <p className="text-sm text-terracotta">${experience.price}</p>
                  </div>
                  <p className="mt-2 text-sm text-sage">
                    {experience.description}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-sage">
                    {experience.duration}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-[#1a2b27] text-cloud">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_60%)]" />
            <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(213,179,106,0.55),_transparent_70%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between px-8 py-10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-100/70">
                  The lounge
                </p>
                <h3 className="mt-3 font-display text-3xl">
                  The Atrium Bar
                </h3>
                <p className="mt-4 text-sm text-amber-100/80">
                  Velvet seating, smoked citrus cocktails, and an ambient playlist
                  curated by local DJs.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-sm">
                <p className="text-amber-100/70">Tonight</p>
                <p className="mt-2 text-lg text-cloud">Live jazz · 8:00 PM</p>
                <Link
                  className="mt-1 inline-flex text-xs uppercase tracking-[0.2em] text-amber-100/70"
                  href="/dining/atrium-bar"
                >
                  Reserve a table
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="amenities" className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sage">
                Amenities
              </p>
              <h2 className="font-display text-3xl sm:text-4xl">
                Every detail, deliberately chosen
              </h2>
            </div>
            <p className="max-w-lg text-sm text-sage">
              Thoughtful extras ensure you can slow down, settle in, and savor
              every hour of your stay.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hotelData.amenities.map((amenity) => {
              const content = (
                <>
                  <h3 className="font-display text-2xl text-ink">
                    {amenity.title}
                  </h3>
                  <p className="mt-3 text-sm text-sage">
                    {amenity.description}
                  </p>
                  {amenity.href && (
                    <span className="mt-4 inline-flex text-xs uppercase tracking-[0.25em] text-terracotta">
                      View details
                    </span>
                  )}
                </>
              );

              if (amenity.href) {
                return (
                  <Link
                    key={amenity.title}
                    href={amenity.href}
                    className="rounded-[26px] border border-ink/10 bg-cloud/70 px-6 py-6 shadow-[0_18px_50px_rgba(44,45,39,0.08)] transition hover:-translate-y-1 hover:border-ink/30"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={amenity.title}
                  className="rounded-[26px] border border-ink/10 bg-cloud/70 px-6 py-6 shadow-[0_18px_50px_rgba(44,45,39,0.08)]"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section id="packages" className="mt-20">
          <div className="rounded-[32px] bg-[#f5ece2] px-8 py-10 shadow-[0_25px_70px_rgba(44,45,39,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sage">
                  Seasonal packages
                </p>
                <h2 className="font-display text-3xl sm:text-4xl">
                  Design your perfect stay
                </h2>
              </div>
              <Link
                className="rounded-full bg-ink px-6 py-3 text-sm text-cloud"
                href="/offers"
              >
                View offers
              </Link>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {hotelData.packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="rounded-[24px] border border-ink/10 bg-cloud/90 px-6 py-5"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-terracotta">
                    {pkg.highlight}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-ink">
                    {pkg.name}
                  </h3>
                  <p className="mt-3 text-sm text-sage">{pkg.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-3">
          {hotelData.testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-[28px] border border-ink/10 bg-cloud/90 px-6 py-6"
            >
              <p className="text-sm text-sage">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <p className="mt-4 font-display text-lg text-ink">
                {testimonial.name}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-sage">
                {testimonial.location}
              </p>
            </div>
          ))}
        </section>

        <section id="api" className="mt-20">
          <div className="rounded-[32px] border border-ink/10 bg-cloud/90 px-8 py-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sage">
                  Developer API
                </p>
                <h2 className="font-display text-3xl sm:text-4xl">
                  Connect Aurum Atelier to your apps
                </h2>
              </div>
              <p className="max-w-lg text-sm text-sage">
                Every endpoint is CORS-enabled and returns JSON. Use these routes
                in booking widgets, concierge apps, or internal dashboards.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {[
                "GET /api/hotel",
                "GET /api/rooms",
                "GET /api/availability?checkIn=2026-03-12&checkOut=2026-03-14&guests=2",
                "POST /api/bookings",
                "POST /api/dining/reservations",
                "GET /api/guests",
                "POST /api/blocks",
              ].map((endpoint) => (
                <div
                  key={endpoint}
                  className="rounded-2xl border border-ink/10 bg-white/80 px-5 py-4"
                >
                  <p className="text-sm text-ink">{endpoint}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#1c2622] p-5 text-sm text-amber-100/80">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                Sample request
              </p>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-amber-100/90">
{`curl -X POST http://localhost:3000/api/bookings \\
  -H "Content-Type: application/json" \\
  -d '{"roomId":"harbor-suite","checkIn":"2026-03-12","checkOut":"2026-03-14","guests":2,"name":"Jordan Blake","email":"jordan@example.com"}'`}
              </pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 px-6 py-10 text-sm text-sage sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-display text-lg text-ink">
              {hotelData.hotel.name}
            </p>
            <p className="mt-1">{hotelData.hotel.address}</p>
          </div>
          <div className="text-xs uppercase tracking-[0.3em]">
            <a className="hover:text-ink" href={`tel:${hotelData.hotel.phone}`}>
              {hotelData.hotel.phone}
            </a>{" "}
            ·{" "}
            <a className="hover:text-ink" href={`mailto:${hotelData.hotel.email}`}>
              {hotelData.hotel.email}
            </a>
          </div>
        </div>
      </footer>

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
              A confirmation email has been sent to{" "}
              {form.email || "your inbox"}.
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
