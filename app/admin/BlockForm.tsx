"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type RoomOption = {
  id: string;
  name: string;
};

type Props = {
  rooms: RoomOption[];
};

export default function BlockForm({ rooms }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    roomId: rooms[0]?.id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!form.roomId || !form.startDate || !form.endDate) {
      setError("Room, start date, and end date are required.");
      return;
    }

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError("End date must be after the start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: form.roomId,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to create block.");
        return;
      }

      setStatus("Block created.");
      setForm((prev) => ({ ...prev, reason: "" }));
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Room
          <select
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            value={form.roomId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, roomId: event.target.value }))
            }
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Start date
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="date"
            value={form.startDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, startDate: event.target.value }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          End date
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="date"
            value={form.endDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, endDate: event.target.value }))
            }
          />
        </label>
        <label className="text-xs uppercase tracking-[0.2em] text-sage">
          Reason
          <input
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink"
            type="text"
            placeholder="Maintenance, VIP hold, etc."
            value={form.reason}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, reason: event.target.value }))
            }
          />
        </label>
      </div>

      <button
        className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cloud shadow-[0_18px_45px_rgba(25,32,28,0.35)]"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create block"}
      </button>

      {status && (
        <p className="text-xs uppercase tracking-[0.2em] text-sage">{status}</p>
      )}
      {error && (
        <p className="text-xs uppercase tracking-[0.2em] text-terracotta">
          {error}
        </p>
      )}
    </form>
  );
}
