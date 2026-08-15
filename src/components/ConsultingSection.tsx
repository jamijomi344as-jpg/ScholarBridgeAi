"use client";

import React, { useState } from "react";
import { Headset, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { StudentProfile } from "./Navbar";

interface ConsultingSectionProps {
  activeProfile: StudentProfile | null;
}

const TOPICS = [
  "University selection strategy",
  "Scholarship application help",
  "SOP / essay review (1-on-1)",
  "Application roadmap planning",
  "Visa & financial documents",
  "Other",
];

export function ConsultingSection({ activeProfile }: ConsultingSectionProps) {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consulting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          topic,
          message,
          preferredContact: preferredContact || activeProfile.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Headset className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">1-on-1 Consulting</h2>
          <p className="text-xs text-slate-500">
            Get personal guidance from our admissions experts — we&apos;ll review your profile and reply with a plan.
          </p>
        </div>
      </div>

      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">Request sent!</h3>
          <p className="text-xs text-slate-600">
            Our team will review your request and contact you at{" "}
            <b>{preferredContact || activeProfile?.email}</b>. Expect a reply within 1-2 business days.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              What do you need help with?
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Tell us about your situation (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="e.g. I have GPA 3.5, IELTS 7.0, budget $20k/year — I need help choosing 5 universities and finding full scholarships…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Preferred contact (Telegram / phone / email)
            </label>
            <input
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
              placeholder={activeProfile?.email || "your contact"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !activeProfile}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send consulting request
          </button>

          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-3 w-3" /> Response within 1-2 business days
          </p>
        </form>
      )}
    </div>
  );
}
