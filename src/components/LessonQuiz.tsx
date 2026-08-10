"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Award } from "lucide-react";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Quiz {
  id: number;
  title: string;
  passThreshold: number;
  questions: QuizQuestion[];
}

interface LessonQuizProps {
  quiz: Quiz;
  profileId: number;
  onCompleted: (result: { score: number; passed: boolean }) => void;
}

export function LessonQuiz({ quiz, profileId, onCompleted }: LessonQuizProps) {
  const t = useTranslations("courses");
  const [answers, setAnswers] = useState<(number | null)[]>(quiz.questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; perQuestion: boolean[] } | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  const selectAnswer = (qIndex: number, optIndex: number) => {
    if (result) return;
    setAnswers((prev) => prev.map((a, i) => (i === qIndex ? optIndex : a)));
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting || result) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quizzes/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, profileId, answers }),
      });
      const data = await res.json();
      const perQuestion = quiz.questions.map((q, i) => Number(answers[i]) === q.correctOptionIndex);
      setResult({ score: data.score ?? 0, passed: data.passed ?? false, perQuestion });
      onCompleted({ score: data.score ?? 0, passed: data.passed ?? false });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          {quiz.title}
        </h3>
        <span className="text-[11px] text-slate-400">{t("score")}: ≥ {quiz.passThreshold}%</span>
      </div>

      {result && (
        <div className={`p-4 rounded-xl ${result.passed ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${result.passed ? "bg-emerald-600" : "bg-amber-500"}`}>
              <span className="text-white font-extrabold text-sm">{result.score}%</span>
            </div>
            <div>
              <p className={`font-bold text-sm ${result.passed ? "text-emerald-800" : "text-amber-800"}`}>
                {result.passed ? t("passed") : `${t("failed")} ${quiz.passThreshold}%`}
              </p>
              <p className="text-[11px] text-slate-500">{t("score")}: {result.score}%</p>
            </div>
          </div>
        </div>
      )}

      {quiz.questions.map((q, qIndex) => (
        <div key={q.id} className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            {qIndex + 1}. {q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, optIndex) => {
              const selected = answers[qIndex] === optIndex;
              const isCorrect = q.correctOptionIndex === optIndex;
              const showFeedback = !!result;

              let cls = "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50";
              if (showFeedback) {
                if (isCorrect) cls = "border-emerald-300 bg-emerald-50";
                else if (selected) cls = "border-red-300 bg-red-50";
                else cls = "border-slate-200 opacity-50";
              } else if (selected) {
                cls = "border-indigo-400 bg-indigo-50";
              }

              return (
                <button
                  key={optIndex}
                  onClick={() => selectAnswer(qIndex, optIndex)}
                  disabled={!!result}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${cls}`}
                >
                  <span className="text-slate-700">{opt}</span>
                  {showFeedback && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  {showFeedback && selected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50"
        >
          {t("submitQuiz")}
        </button>
      )}
    </div>
  );
}
