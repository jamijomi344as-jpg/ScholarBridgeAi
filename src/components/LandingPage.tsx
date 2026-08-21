"use client";

import React from "react";
import {
  Sparkles,
  Search,
  Award,
  FileText,
  Video,
  MessagesSquare,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Gift,
  ShieldCheck,
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  onEnterApp?: () => void;
  onSignIn?: () => void;
}

/**
 * English landing page — shown to first-time visitors (via referral links or
 * organic search). Explains what ScholarBridge does, then "Start for free"
 * launches the step-by-step onboarding wizard.
 */
export function LandingPage({ onStart, onEnterApp, onSignIn }: LandingPageProps) {
  const features = [
    {
      icon: Search,
      title: "University Matcher",
      text: "Find universities that fit your GPA, IELTS score, budget and major — with an automatic Reach / Match / Safety rating for every option.",
    },
    {
      icon: Award,
      title: "Scholarship Hub",
      text: "Discover grants and scholarships you're actually eligible for: DAAD, Chevening, Erasmus Mundus, Fulbright and hundreds more.",
    },
    {
      icon: FileText,
      title: "AI SOP & Essays",
      text: "Generate, evaluate and polish your Statement of Purpose with AI guidance at every step — even if you've never written one before.",
    },
    {
      icon: Video,
      title: "Video Courses",
      text: "Step-by-step video lessons on applications, visas and funding, with quizzes and certificates to track your progress.",
    },
    {
      icon: MessagesSquare,
      title: "Community Forum",
      text: "Ask questions, share experience and connect with other students who are applying abroad right now.",
    },
    {
      icon: Gift,
      title: "Referral Rewards",
      text: "Invite friends and earn premium access — 30 days of Premium for every 5 friends who join and complete their profile.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Create your profile",
      text: "Tell us your name, email, GPA, test scores and budget — takes less than 2 minutes, step by step.",
    },
    {
      num: "02",
      title: "Get your matches",
      text: "Our engine matches you against universities and scholarships based on your real academic profile.",
    },
    {
      num: "03",
      title: "Apply & get funded",
      text: "Track applications, write your SOP with AI help and land grants that cover your studies.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ===== Top bar ===== */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://llwrzitajdsnqzpvflnj.supabase.co/storage/v1/object/public/LOGO/logo.png"
                alt="ScholarBridge Logo"
                className="h-8 w-8 object-cover"
              />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight">ScholarBridge</span>
          </div>
          {onSignIn && (
            <button
              onClick={onSignIn}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl border border-indigo-200 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] bg-[length:28px_28px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            AI-powered study abroad platform
          </div>
          <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Study Abroad. Get Funded.
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
              Achieve More.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm sm:text-base text-indigo-100 leading-relaxed">
            ScholarBridge matches you with the right universities and scholarships
            based on your GPA, IELTS score and budget — then helps you write a
            winning application, with AI at every step.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-4 text-sm font-extrabold text-slate-900 shadow-xl shadow-amber-500/25 hover:from-amber-300 hover:to-yellow-400 transition-all"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-sm font-bold hover:bg-white/20 transition-colors"
            >
              How it works
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-indigo-200">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Free university &amp; scholarship matching
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Built for international students
            </span>
          </div>
          {onEnterApp && (
            <button
              onClick={onEnterApp}
              className="mt-6 text-xs font-semibold text-indigo-200 underline-offset-4 hover:text-white hover:underline transition-colors"
            >
              Already have a profile? Enter the app →
            </button>
          )}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900">
          How ScholarBridge works
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          From first profile to funded admission — in three simple steps.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 relative overflow-hidden"
            >
              <div className="text-4xl font-extrabold text-indigo-100 absolute -top-1 right-3 select-none">
                {s.num}
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-extrabold text-sm">
                {s.num}
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900">
            Everything you need to study abroad
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            One platform for research, applications, funding and community.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="mt-3 text-sm font-extrabold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Trust / stats ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Free to start
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-extrabold">
              Your dream university is closer than you think
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Join thousands of students who found their path abroad. Create your
              profile in 2 minutes — matching is completely free.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Globe2 className="h-8 w-8 text-amber-300 hidden sm:block" />
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-7 py-3.5 text-sm font-extrabold text-slate-900 shadow-lg hover:from-amber-300 hover:to-yellow-400 transition-all"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} ScholarBridge AI — Global Admissions &amp; Scholarship Discovery</p>
          <p className="text-slate-400">Free profile matching · Premium unlocks AI SOP, Courses, Forum &amp; more</p>
        </div>
      </footer>
    </div>
  );
}
