"use client";

import React from "react";
import { User, ShieldCheck, Crown, X } from "lucide-react";
import { StudentProfile } from "./Navbar";

interface ProfilePickerProps {
  open: boolean;
  profiles: StudentProfile[];
  currentId: number | null;
  onClose: () => void;
  onSelect: (profile: StudentProfile) => void;
  onAddNew: () => void;
}

/**
 * Profile picker — the ONLY place where the full list of profiles is shown
 * (so admins can get back to their admin account). It's hidden by default:
 * the app always starts with the profile stored in this browser.
 */
export function ProfilePicker({
  open,
  profiles,
  currentId,
  onClose,
  onSelect,
  onAddNew,
}: ProfilePickerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-8">
        <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Choose a profile</h2>
            <p className="text-xs text-indigo-100 mt-0.5">
              Sign in with one of your profiles to continue
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
          {profiles.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">
              No profiles found yet — create your first one!
            </p>
          )}

          {profiles.map((p) => {
            const isCurrent = p.id === currentId;
            const isAdmin = !!p.isAdmin;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                  isCurrent
                    ? "border-indigo-300 bg-indigo-50/60 cursor-default"
                    : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
                    isAdmin ? "bg-slate-900 text-amber-300" : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-slate-800">{p.name}</span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
                        <ShieldCheck className="h-2.5 w-2.5 text-amber-300" /> ADMIN
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-400">
                    {p.email} · {p.targetMajor}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-indigo-600 shrink-0">ACTIVE</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white hover:from-indigo-700 hover:to-violet-700 transition-all"
          >
            <User className="h-4 w-4" /> Create a new profile
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Crown className="h-3 w-3 text-amber-500" />
            Admin accounts are marked ADMIN — pick yours to open the Admin Panel.
          </p>
        </div>
      </div>
    </div>
  );
}
