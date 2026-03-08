"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
  onSubmitted?: () => void;
};

const CATEGORY_OPTIONS = [
  { value: "pothole", label: "Pothole" },
  { value: "streetlight", label: "Streetlight Outage" },
  { value: "garbage", label: "Illegal Dumping / Garbage" },
  { value: "graffiti", label: "Graffiti" },
  { value: "sidewalk", label: "Sidewalk Damage" },
] as const;

export default function ReportIssueForm({ slug, onSubmitted }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("pothole");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      () => {
        setError("Unable to detect your location. Please allow location access and retry.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const canSubmit = useMemo(() => {
    return !isSubmitting && title.trim().length >= 3 && description.trim().length >= 10 && latitude != null && longitude != null;
  }, [description, isSubmitting, latitude, longitude, title]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (latitude == null || longitude == null) {
      setError("Location is required to submit an issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/report-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          description: description.trim(),
          category,
          latitude,
          longitude,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Failed to submit issue.");
      }

      setTitle("");
      setDescription("");
      setSuccessMessage("Issue submitted successfully. Thank you for reporting.");
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit issue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="report-title">
          Title
        </label>
        <input
          id="report-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Brief issue title"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="report-description">
          Description
        </label>
        <textarea
          id="report-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Describe the issue and nearby landmarks."
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="report-category">
          Category
        </label>
        <select
          id="report-category"
          value={category}
          onChange={(event) => setCategory(event.target.value as (typeof CATEGORY_OPTIONS)[number]["value"])}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {latitude != null && longitude != null
          ? `Location detected: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : "Detecting your location..."}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Submitting..." : "Submit Issue"}
      </button>
    </form>
  );
}
