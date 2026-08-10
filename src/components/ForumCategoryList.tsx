"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid } from "lucide-react";

export interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  threadCount: number;
}

interface ForumCategoryListProps {
  categories: ForumCategory[];
  activeCategoryId: number | "all";
  onSelect: (categoryId: number | "all") => void;
}

export function ForumCategoryList({ categories, activeCategoryId, onSelect }: ForumCategoryListProps) {
  const t = useTranslations("forum");

  const totalThreads = categories.reduce((sum, c) => sum + (c.threadCount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
      <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-2">
        <LayoutGrid className="h-4 w-4 text-indigo-600" />
        {t("categories")}
      </div>

      <button
        onClick={() => onSelect("all")}
        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
          activeCategoryId === "all"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <span>{t("allCategories")}</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeCategoryId === "all" ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>
            {totalThreads}
          </span>
        </div>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
            activeCategoryId === cat.id
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{cat.name}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeCategoryId === cat.id ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>
              {cat.threadCount || 0}
            </span>
          </div>
          {cat.description && (
            <p className={`text-[10px] mt-1 leading-snug ${activeCategoryId === cat.id ? "text-indigo-100" : "text-slate-400"}`}>
              {cat.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
