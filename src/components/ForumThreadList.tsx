"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Pin,
  MessageSquare,
  Eye,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  PenSquare,
} from "lucide-react";

export interface ForumThreadSummary {
  id: number;
  categoryId: number;
  authorId: number;
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  categoryName: string | null;
  replyCount: number | null;
  likeCount: number | null;
}

export type ForumSort = "latest" | "replies" | "likes";

interface ForumThreadListProps {
  threads: ForumThreadSummary[];
  sort: ForumSort;
  onSortChange: (sort: ForumSort) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenThread: (id: number) => void;
  onStartThread: () => void;
}

export function ForumThreadList({
  threads,
  sort,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  onOpenThread,
  onStartThread,
}: ForumThreadListProps) {
  const t = useTranslations("forum");

  const sortOptions: { id: ForumSort; label: string }[] = [
    { id: "latest", label: t("latest") },
    { id: "replies", label: t("mostReplies") },
    { id: "likes", label: t("mostLikes") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
          {sortOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSortChange(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                sort === opt.id ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onStartThread}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
        >
          <PenSquare className="h-4 w-4" />
          {t("startThread")}
        </button>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-500">{t("noThreads")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onOpenThread(thread.id)}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <Pin className="h-3 w-3" /> {t("pinned")}
                      </span>
                    )}
                    {thread.isLocked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                        🔒 {t("locked")}
                      </span>
                    )}
                    {thread.categoryName && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100">
                        {thread.categoryName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">{thread.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{thread.body}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">👤 {thread.authorName || "Student"}</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> {thread.replyCount ?? 0} {t("replies")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {thread.viewCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" /> {thread.likeCount ?? 0}
                </span>
                <span className="ml-auto">
                  {new Date(thread.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
