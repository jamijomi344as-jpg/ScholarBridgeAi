"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { ForumCategoryList, ForumCategory } from "./ForumCategoryList";
import { ForumThreadList, ForumThreadSummary, ForumSort } from "./ForumThreadList";
import { ForumThreadView, ForumReplyItem } from "./ForumThreadView";
import { ForumModerationPanel, ForumReportItem } from "./ForumModerationPanel";

interface ForumSectionProps {
  activeProfile: StudentProfile | null;
  isModerator?: boolean;
}

interface ThreadDetail {
  id: number;
  authorId: number;
  authorName: string | null;
  categoryId: number;
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  createdAt: string;
  categoryName: string | null;
  likeCount: number;
}

export function ForumSection({ activeProfile, isModerator = false }: ForumSectionProps) {
  const t = useTranslations("forum");
  const userId = activeProfile?.id ?? null;

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [sort, setSort] = useState<ForumSort>("latest");
  const [threads, setThreads] = useState<ForumThreadSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openThread, setOpenThread] = useState<ThreadDetail | null>(null);
  const [replies, setReplies] = useState<ForumReplyItem[]>([]);
  const [reports, setReports] = useState<ForumReportItem[]>([]);
  const [showModeration, setShowModeration] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);

  // New thread form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<number | "">("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/categories");
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort, page: String(page) });
      if (activeCategory !== "all") params.set("categoryId", String(activeCategory));
      const res = await fetch(`/api/forum/threads?${params.toString()}`);
      const data = await res.json();
      if (data.threads) {
        setThreads(data.threads);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      console.error(err);
    }
  }, [sort, page, activeCategory]);

  const loadReports = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/forum/reports?status=open&adminProfileId=${userId}`);
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  const openThreadById = useCallback(async (threadId: number) => {
    try {
      const [detailRes, replyRes] = await Promise.all([
        fetch(`/api/forum/threads/${threadId}`),
        fetch(`/api/forum/replies?threadId=${threadId}`),
      ]);
      const detail = await detailRes.json();
      const replyData = await replyRes.json();
      if (detail.thread) setOpenThread(detail.thread);
      if (replyData.replies) setReplies(replyData.replies);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (showModeration) loadReports();
  }, [showModeration, loadReports]);

  const handleCategoryChange = (categoryId: number | "all") => {
    setActiveCategory(categoryId);
    setPage(1);
  };

  const handleSortChange = (next: ForumSort) => {
    setSort(next);
    setPage(1);
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle || !newBody || !newCategory) return;
    try {
      await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: newCategory, authorId: userId, title: newTitle, body: newBody }),
      });
      setShowNewThread(false);
      setNewTitle("");
      setNewBody("");
      setNewCategory("");
      loadThreads();
      loadCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLike = async (targetType: "thread" | "reply", targetId: number) => {
    if (!userId) return;
    try {
      await fetch("/api/forum/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetType, targetId }),
      });
      if (openThread) openThreadById(openThread.id);
      loadThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async (targetType: "thread" | "reply", targetId: number, reason: string) => {
    if (!userId) return;
    try {
      await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporterId: userId, targetType, targetId, reason }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (body: string, parentReplyId?: number | null) => {
    if (!userId || !openThread) return;
    try {
      await fetch("/api/forum/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: openThread.id, authorId: userId, body, parentReplyId: parentReplyId ?? null }),
      });
      openThreadById(openThread.id);
      loadThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!userId) return;
    try {
      await fetch(`/api/forum/replies/${replyId}?requesterId=${userId}`, { method: "DELETE" });
      if (openThread) openThreadById(openThread.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async () => {
    if (!openThread) return;
    try {
      await fetch(`/api/forum/threads/${openThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !openThread.isPinned }),
      });
      openThreadById(openThread.id);
      loadThreads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async () => {
    if (!openThread) return;
    try {
      await fetch(`/api/forum/threads/${openThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !openThread.isLocked }),
      });
      openThreadById(openThread.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteThread = async () => {
    if (!openThread || !userId) return;
    try {
      await fetch(`/api/forum/threads/${openThread.id}?requesterId=${userId}`, { method: "DELETE" });
      setOpenThread(null);
      setReplies([]);
      loadThreads();
      loadCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (reportId: number) => {
    if (!userId) return;
    try {
      await fetch(`/api/forum/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", adminProfileId: userId }),
      });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissReport = async (reportId: number) => {
    if (!userId) return;
    try {
      await fetch(`/api/forum/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed", adminProfileId: userId }),
      });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTarget = async (targetType: "thread" | "reply", targetId: number) => {
    if (!userId) return;
    if (targetType === "thread") {
      await fetch(`/api/forum/threads/${targetId}?requesterId=${userId}`, { method: "DELETE" });
      if (openThread?.id === targetId) {
        setOpenThread(null);
        setReplies([]);
      }
    } else {
      await fetch(`/api/forum/replies/${targetId}?requesterId=${userId}`, { method: "DELETE" });
      if (openThread) openThreadById(openThread.id);
    }
    loadReports();
    loadThreads();
    loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <MessagesSquare className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold">{t("title")}</h1>
              <p className="text-xs text-slate-300 mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
          {isModerator && (
            <button
              onClick={() => setShowModeration((v) => !v)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                showModeration ? "bg-amber-400 text-slate-900" : "bg-white/10 border border-white/20 hover:bg-white/20"
              }`}
            >
              {showModeration ? "✕" : `🛡️ ${t("moderation")}`}
            </button>
          )}
        </div>
      </div>

      {showModeration && isModerator && (
        <ForumModerationPanel
          reports={reports}
          onResolve={handleResolveReport}
          onDismiss={handleDismissReport}
          onDeleteTarget={handleDeleteTarget}
        />
      )}

      {openThread ? (
        <ForumThreadView
          thread={openThread}
          replies={replies}
          currentUserId={userId}
          isModerator={isModerator}
          onBack={() => {
            setOpenThread(null);
            setReplies([]);
          }}
          onToggleLike={handleToggleLike}
          onReport={handleReport}
          onPostReply={handlePostReply}
          onDeleteReply={handleDeleteReply}
          onTogglePin={handleTogglePin}
          onToggleLock={handleToggleLock}
          onDeleteThread={handleDeleteThread}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ForumCategoryList categories={categories} activeCategoryId={activeCategory} onSelect={handleCategoryChange} />
          </div>
          <div className="lg:col-span-3">
            <ForumThreadList
              threads={threads}
              sort={sort}
              onSortChange={handleSortChange}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onOpenThread={openThreadById}
              onStartThread={() => setShowNewThread(true)}
            />
          </div>
        </div>
      )}

      {/* New thread modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">{t("startThread")}</h3>
            <form onSubmit={handleCreateThread} className="space-y-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="">{t("selectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("threadTitle")}
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t("threadBody")}
                rows={4}
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewThread(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
                  {t("cancel")}
                </button>
                <button type="submit" disabled={!newTitle || !newBody || !newCategory} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {t("postThread")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
