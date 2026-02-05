"use client";

import { useState, type FormEvent } from "react";

type Props = {
  venue: string;
  venueLabel: string;
};

export default function ReservationForm({ venue, venueLabel }: Props) {
  const [form, setForm] = useState({
    reservationDate: "",
    reservationTime: "",
    partySize: 2,
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!form.reservationDate || !form.reservationTime) {
      setError("Please select a date and time.");
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setError("Please provide your name and email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/dining/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue,
          reservationDate: form.reservationDate,
          reservationTime: form.reservationTime,
          partySize: Number(form.partySize) || 1,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = (await response.json()) as {
        reservation?: { confirmationId?: string };
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to create reservation.");
        return;
      }

      setMessage(
        `Reservation confirmed at ${venueLabel}. Confirmation: ${
          data.reservation?.confirmationId ?? "Pending"
        }`
      );
    } catch {
      setError("Unable to reach the reservation service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Date
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="date"
            value={form.reservationDate}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                reservationDate: event.target.value,
              }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Time
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="time"
            value={form.reservationTime}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                reservationTime: event.target.value,
              }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Party size
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="number"
            min={1}
            value={form.partySize}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partySize: Number(event.target.value) || 1,
              }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Name
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Email
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Phone (optional)
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="tel"
            value={form.phone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phone: event.target.value }))
            }
          />
        </label>
      </div>

      <label className="text-xs uppercase tracking-[0.2em] text-sage">
        Notes
        <textarea
          className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
          rows={3}
          value={form.notes}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, notes: event.target.value }))
          }
        />
      </label>

      <button
        className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cloud shadow-[0_18px_45px_rgba(25,32,28,0.35)]"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Confirm reservation"}
      </button>

      {message && (
        <p className="text-xs uppercase tracking-[0.2em] text-sage">{message}</p>
      )}
      {error && (
        <p className="text-xs uppercase tracking-[0.2em] text-terracotta">
          {error}
        </p>
      )}
    </form>
  );
}
