"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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

type LiveHotelBridge = {
  scrollToId: (id: string, behavior?: ScrollBehavior) => void;
  navigate: (path: string, replace?: boolean) => void;
  openBooking: () => void;
  selectRoom: (roomId: string) => void;
  setBookingDates: (dates: { checkIn?: string; checkOut?: string }) => void;
  setBookingGuests: (guests: number) => void;
  setBookingContact: (contact: {
    name?: string;
    email?: string;
    phone?: string;
    specialRequests?: string;
  }) => void;
  setBookingAddress: (address: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }) => void;
  setBookingPreferences: (prefs: {
    arrivalTime?: string;
    bedPreference?: string;
    occasion?: string;
    accessibility?: string;
    specialRequests?: string;
  }) => void;
  confirmBooking: () => void;
  checkAvailability: (roomId?: string) => void;
};

declare global {
  interface Window {
    LiveHotel?: LiveHotelBridge;
  }
}

function dispatchAction(detail: LiveHotelAction) {
  window.dispatchEvent(new CustomEvent("livehotel:action", { detail }));
}

export default function LiveHotelRpcBridge() {
  const router = useRouter();

  useEffect(() => {
    let lastSelectedRoomId: string | null = null;

    const normalizePath = (path: string) => {
      if (path.startsWith("/rooms/")) {
        return `/suites/${path.slice("/rooms/".length)}`;
      }
      return path;
    };

    const scrollToId = (id: string, behavior: ScrollBehavior = "smooth") => {
      const element = document.getElementById(id);
      if (!element) return;
      element.scrollIntoView({ behavior, block: "start" });
    };

    const navigate = (path: string, replace = false) => {
      if (!path) return;
      const normalized = normalizePath(path);
      if (replace) {
        router.replace(normalized);
      } else {
        router.push(normalized);
      }
    };

    const resolveSelectedRoomId = () => {
      if (lastSelectedRoomId) return lastSelectedRoomId;
      if (typeof window === "undefined") return null;
      const match = window.location.pathname.match(/^\/suites\/([^/]+)/);
      return match?.[1] ?? null;
    };

    const confirmBooking = () => {
      if (typeof window === "undefined") {
        dispatchAction({ type: "confirmBooking" });
        return;
      }

      if (window.location.pathname !== "/booking") {
        const params = new URLSearchParams({ focus: "booking", confirm: "1" });
        const roomId = resolveSelectedRoomId();
        if (roomId) {
          params.set("roomId", roomId);
        }
        window.sessionStorage?.setItem("livehotel:pendingConfirm", "1");
        navigate(`/booking?${params.toString()}`);
        dispatchAction({ type: "openBooking" });
        return;
      }

      dispatchAction({ type: "confirmBooking" });
    };

    window.LiveHotel = {
      scrollToId,
      navigate,
      openBooking: () => {
        const params = new URLSearchParams({ focus: "booking" });
        const roomId = resolveSelectedRoomId();
        if (roomId) {
          params.set("roomId", roomId);
        }
        navigate(`/booking?${params.toString()}`);
        dispatchAction({ type: "openBooking" });
      },
      selectRoom: (roomId) => {
        lastSelectedRoomId = roomId;
        dispatchAction({ type: "selectRoom", roomId });
      },
      setBookingDates: (dates) =>
        dispatchAction({
          type: "setBookingDates",
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
        }),
      setBookingGuests: (guests) =>
        dispatchAction({ type: "setBookingGuests", guests }),
      setBookingContact: (contact) =>
        dispatchAction({
          type: "setBookingContact",
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          specialRequests: contact.specialRequests,
        }),
      setBookingAddress: (address) =>
        dispatchAction({
          type: "setBookingAddress",
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          region: address.region,
          postalCode: address.postalCode,
          country: address.country,
        }),
      setBookingPreferences: (prefs) =>
        dispatchAction({
          type: "setBookingPreferences",
          arrivalTime: prefs.arrivalTime,
          bedPreference: prefs.bedPreference,
          occasion: prefs.occasion,
          accessibility: prefs.accessibility,
          specialRequests: prefs.specialRequests,
        }),
      confirmBooking,
      checkAvailability: (roomId) =>
        dispatchAction({ type: "checkAvailability", roomId }),
    };

    return () => {
      delete window.LiveHotel;
    };
  }, [router]);

  return null;
}
