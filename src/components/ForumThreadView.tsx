"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Pin,
  PinOff,
  Lock,
  Unlock,
  Trash2,
  Flag,
  ThumbsUp,
  MessageSquare,
  Eye,
  Reply as ReplyIcon,
} from "lucide-react";

export interface ForumReplyItem {
  id: number;
  threadId: number;
  authorId: number;
  parentReplyId: number | null;
  body: string;
  createdAt: string;
  authorName: string | null;
  likeCount: number | null;
}

interface ForumThreadViewProps {
  thread: {
    id: number;
    authorId: number;
    authorName?: string | null;
    title: string;
    body: string;
    isPinned: boolean;
    isLocked: boolean;
    viewCount: number;
    categoryName?: string | null;
    likeCount?: number;
    createdAt: string;
  };
  replies: ForumReplyItem[];
  currentUserId: number | null;
  isModerator?: boolean;
  onBack: () => void;
  onToggleLike: (targetType: "thread" | "reply", targetId: number) => void;
  onReport: (targetType: "thread" | "reply", targetId: number, reason: string) => void;
  onPostReply: (body: string, parentReplyId?: number | null) => void;
  onDeleteReply: (id: number) => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onDeleteThread: () => void;
}

function buildTree(replies: ForumReplyItem[]): (ForumReplyItem & { children: (ForumReplyItem & { children: never[] })[] })[] {
  const map = new Map<number, any>();
  replies.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: any[] = [];
  replies.forEach((r) => {
    if (r.parentReplyId && map.has(r.parentReplyId)) {
      map.get(r.parentReplyId).children.push(map.get(r.id));
    } else {
      roots.push(map.get(r.id));
    }
  });
  return roots;
}

export function ForumThreadView({
  thread,
  replies,
  currentUserId,
  isModerator = false,
  onBack,
  onToggleLike,
  onReport,
  onPostReply,
  onDeleteReply,
  onTogglePin,
  onToggleLock,
  onDeleteThread,
}: ForumThreadViewProps) {
  const t = useTranslations("forum");
  const tree = useMemo(() => buildTree(replies), [replies]);

  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ targetType: "thread" | "reply"; targetId: number } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onPostReply(replyText.trim(), replyingTo?.id ?? null);
    setReplyText("");
    setReplyingTo(null);
  };

  const handleReportSubmit = () => {
    if (!reportTarget || !reportReason.trim()) return;
    onReport(reportTarget.targetType, reportTarget.targetId, reportReason.trim());
    setReportTarget(null);
    setReportReason("");
  };

  const renderReply = (reply: any, depth: number) => (
    <div key={reply.id} className={`${depth > 0 ? "ml-4 sm:ml-8 mt-3" : "mt-3"} bg-slate-50 border border-slate-100 rounded-xl p-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-bold text-slate-700">👤 {reply.authorName || "Student"}</span>
          <span>•</span>
          <span>{new Date(reply.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleLike("reply", reply.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <ThumbsUp className="h-3.5 w-3.5" /> {reply.likeCount ?? 0}
          </button>
          <button
            onClick={() => setReplyingTo({ id: reply.id, name: reply.authorName || "Student" })}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <ReplyIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setReportTarget({ targetType: "reply", targetId: reply.id })}
            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title={t("report")}
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          {(isModerator || reply.authorId === currentUserId) && (
            <button
              onClick={() => onDeleteReply(reply.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title={t("deleteReply")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{reply.body}</p>
      {reply.children.length > 0 && (
        <div>{reply.children.map((c: any) => renderReply(c, depth + 1))}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </button>

      {/* Thread body */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
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
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
              {thread.categoryName}
            </span>
          )}
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 mt-2">{thread.title}</h2>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
          <span className="font-semibold text-slate-600">👤 {thread.authorName || "Student"}</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {thread.viewCount}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {thread.likeCount ?? 0}</span>
          <span>{new Date(thread.createdAt).toLocaleString()}</span>
        </div>

        <p className="text-sm text-slate-700 mt-4 whitespace-pre-wrap leading-relaxed">{thread.body}</p>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => onToggleLike("thread", thread.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <ThumbsUp className="h-4 w-4" /> {t("like")}
          </button>
          <button
            onClick={() => setReportTarget({ targetType: "thread", targetId: thread.id })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Flag className="h-4 w-4" /> {t("report")}
          </button>

          {isModerator && (
            <>
              <button onClick={onTogglePin} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                {thread.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {thread.isPinned ? t("unpin") : t("pin")}
              </button>
              <button onClick={onToggleLock} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                {thread.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {thread.isLocked ? t("unlock") : t("lock")}
              </button>
            </>
          )}
          {(isModerator || thread.authorId === currentUserId) && (
            <button onClick={onDeleteThread} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
              <Trash2 className="h-4 w-4" /> {t("deleteThread")}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-indigo-600" />
          {replies.length} {t("replies")}
        </h3>

        {tree.length === 0 && <p className="text-xs text-slate-400 mt-2">{t("noThreads")}</p>}
        {tree.map((reply) => renderReply(reply, 0))}

        {/* Reply box */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          {replyingTo && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 bg-slate-50 rounded-lg px-3 py-1.5">
              <span>{t("replyTo")}: <b>{replyingTo.name}</b></span>
              <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}
          <form onSubmit={handleSubmitReply} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              disabled={thread.isLocked}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={thread.isLocked ? "🔒" : t("replyPlaceholder")}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || thread.isLocked}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              {t("postReply")}
            </button>
          </form>
        </div>
      </div>

      {/* Report modal */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">{t("report")}</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t("reportReason")}
              className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReportTarget(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
                {t("cancel")}
              </button>
              <button onClick={handleReportSubmit} disabled={!reportReason.trim()} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {t("submitReport")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
