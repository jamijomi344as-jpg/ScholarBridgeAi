"use client";

import React from "react";
import { Star } from "lucide-react";

interface PointsBadgeProps {
  points: number;
  levelName?: string;
  levelIcon?: string;
}

export function PointsBadge({ points, levelName, levelIcon }: PointsBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
      <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
      <span className="text-xs font-extrabold text-amber-700">{points.toLocaleString()} pts</span>
      {levelName && (
        <span className="text-[11px] font-semibold text-slate-500">
          {levelIcon} {levelName}
        </span>
      )}
    </div>
  );
}
