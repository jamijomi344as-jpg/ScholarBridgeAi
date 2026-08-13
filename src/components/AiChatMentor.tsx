"use client";

import React, { useState } from "react";
import { StudentProfile } from "./Navbar";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  HelpCircle, 
  MessageSquare,
  Globe,
  Briefcase,
  Award
} from "lucide-react";

interface AiChatMentorProps {
  activeProfile: StudentProfile | null;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AiChatMentor({ activeProfile }: AiChatMentorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: `Hello ${activeProfile?.name || "there"}! I'm **ScholarBridge AI**, your global study counselor. 

I'm aware of your profile (**${activeProfile?.degreeLevel} in ${activeProfile?.targetMajor}**, GPA ${activeProfile?.gpa}/${activeProfile?.gpaScale}, budget $${activeProfile?.budgetAnnualUsd?.toLocaleString()}/yr).

How can I help you today? Ask me about **work visas (OPT/PGWP/Graduate Route)**, **scholarship strategy**, **SOP advice**, or **university selections**!`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "Which countries offer 3-year post-graduation work permits?",
    "How should I structure my request for an LOR from my professor?",
    "What are the top low-tuition universities in Europe for Computer Science?",
    "What documents do I need to prepare for my F-1 / Student Visa interview?",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          profileId: activeProfile?.id,
          chatHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: data.reply,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "I encountered a brief network glitch. Please try asking again!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
            <Bot className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="font-bold text-base flex items-center gap-2">
              ScholarBridge AI Counselor
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                Online
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              Personalized for {activeProfile?.name} • {activeProfile?.targetMajor}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-3xl ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-amber-300"
              }`}
            >
              {m.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-xs"
                  : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xs whitespace-pre-wrap"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-500 italic">
            <Bot className="h-5 w-5 text-indigo-600 animate-pulse" />
            ScholarBridge AI is typing thoughtful advice...
          </div>
        )}
      </div>

      {/* Prompt Suggestions */}
      <div className="p-3 bg-white border-t border-slate-100 flex overflow-x-auto gap-2 no-scrollbar">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-xs text-slate-600 whitespace-nowrap transition-colors"
          >
            💡 {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ask anything about admissions, scholarships, SOP, or visa processes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
