"use client";

import React from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

/**
 * FAQ — ko'rinadigan savol-javoblar bo'limi (SEO uchun) + schema.org/FAQPage
 * JSON-LD structured data (AEO — Google AI Overview, ChatGPT Search,
 * Perplexity uchun). Ko'rinadigan matn va JSON-LD aynan bitta manbadan
 * olinadi, shuning uchun ular har doim bir xil bo'ladi.
 */

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "ScholarBridge qanday ishlaydi va bepulmi?",
    answer:
      "ScholarBridge'da profilingizni (GPA, IELTS, byudjet, yo'nalish) kiritasiz va tizim avtomatik ravishda sizga mos keladigan xorijiy universitetlar hamda grantlarni taklif qiladi. Universitet va grant qidirish, moslik bahosi kabi asosiy funksiyalar bepul. AI SOP yordamchisi, video kurslar va jamoat forumi kabi qo'shimcha imkoniyatlar Premium obuna orqali ochiladi.",
  },
  {
    question: "IELTS 6.5 bilan qaysi davlatlarda grant olsa bo'ladi?",
    answer:
      "IELTS 6.5 darajasi ko'plab nufuzli dasturlar uchun yetarli: Germaniya (DAAD stipendiyalari), Buyuk Britaniya (Chevening), Yevropa Ittifoqi (Erasmus Mundus) va Skandinaviya davlatlari. Ko'pchilik Yevropa universitetlari ham aynan IELTS 6.5 natijasini minimal talab sifatida qabul qiladi.",
  },
  {
    question: "GPA past bo'lsa ham xorijda o'qish mumkinmi?",
    answer:
      "Ha, mumkin. Ko'plab universitetlar va grant dasturlari GPA 3.0 va undan ham pastroq ko'rsatkichni qabul qiladi — ayniqsa ish tajribasi, ilmiy loyihalar va kuchli motivatsiya xati mavjud bo'lsa. ScholarBridge'da GPA 2.5–3.0 oralig'idagi talabalar uchun mos universitetlarni alohida filtrlab topishingiz mumkin.",
  },
  {
    question: "Qaysi grantlar to'liq moliyalashtiriladi?",
    answer:
      "Fulbright, Chevening, DAAD, Erasmus Mundus, Gates Cambridge va Knight-Hennessy kabi dasturlar o'qish to'lovi, yashash xarajatlari va sayohat xarajatlarini to'liq qoplaydi. Har bir dasturning o'ziga xos talablari bor — ScholarBridge ularni profilingizga moslab ko'rsatadi.",
  },
  {
    question: "SOP (Statement of Purpose) nima va uni qanday yozish kerak?",
    answer:
      "SOP — bu universitetga nima uchun aynan siz mos nomzod ekanligingizni tushuntiruvchi insho. U akademik tarixingiz, maqsadlaringiz va tanlagan dasturga bo'lgan qiziqishingizni yoritadi. ScholarBridge'ning AI SOP yordamchisi insho tuzilmasini taklif qiladi, yozgan matningizni baholaydi va uni takomillashtirishga qadam-baqadam ko'maklashadi.",
  },
  {
    question: "Bir vaqtning o'zida nechta universitetga ariza topshirsa bo'ladi?",
    answer:
      "Rasmiy cheklov yo'q, biroq mutaxassislar 5–8 ta universitetni tanlashni tavsiya qiladi: 2–3 ta Reach (yuqori talabli), 2–3 ta Match (mos) va 1–2 ta Safety (kafolatli) toifalarida. ScholarBridge har bir universitet uchun moslik darajasini avtomatik hisoblab, aynan shu toifalarga ajratib beradi.",
  },
  {
    question: "Magistratura uchun qancha byudjet kerak bo'ladi?",
    answer:
      "Xarajat mamlakatga bog'liq: Germaniya va Sharqiy Yevropada yiliga $10,000–15,000, AQSh va Buyuk Britaniyada $40,000–60,000 gacha yetishi mumkin. Grant va stipendiyalar bu xarajatlarni sezilarli kamaytiradi — ba'zi hollarda o'qish va yashash xarajatlarini to'liq qoplaydi.",
  },
  {
    question: "IELTS yoki TOEFL sertifikatisiz ham ariza topshirsa bo'ladimi?",
    answer:
      "Ko'pchilik universitetlar uchun IELTS yoki TOEFL sertifikati majburiy. Ammo ba'zi dasturlar til sertifikatisiz qabul qiladi yoki universitetning ichki til imtihonini muqobil sifatida taklif etadi. ScholarBridge har bir universitet kartasida minimal IELTS talabini ko'rsatadi, shunda siz o'z natijangizga mos dasturlarni tanlaysiz.",
  },
  {
    question: "Grant va stipendiyaning farqi nimada?",
    answer:
      "Ko'pincha bu tushunchalar sinonim sifatida ishlatiladi, lekin grant odatda loyiha yoki tadqiqot uchun bir martalik moliyaviy yordam, stipendiya esa akademik yutuqlar uchun beriladigan muntazam to'lovdir. ScholarBridge ma'lumotlar bazasida ikkala tur ham mavjud va siz ularni coverage turi bo'yicha filtrlashingiz mumkin.",
  },
  {
    question: "Xorijga ariza topshirishni qachon boshlash kerak?",
    answer:
      "Ideal vaqt — o'qish boshlanishidan 12–18 oy oldin. IELTS yoki TOEFL imtihonlariga tayyorlanish, hujjatlar va tavsiyanomalarni yig'ish vaqt talab qiladi. ScholarBridge'ning Tasks & Roadmap bo'limi ariza jarayonini bosqichma-bosqich rejalashtirishga yordam beradi.",
  },
  {
    question: "ScholarBridge ma'lumotlari qanchalik dolzarb?",
    answer:
      "Universitetlar va grantlar bo'yicha ma'lumotlar muntazam yangilanib boriladi va admin panel orqali nazorat qilinadi. Eng so'nggi talablar uchun har doim universitet yoki grant dasturining rasmiy saytini ham tekshirib ko'rishni tavsiya qilamiz.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function FaqSection() {
  return (
    <section className="mt-10" aria-label="Ko'p so'raladigan savollar">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Ko'p so'raladigan savollar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xorijda o'qish, grantlar va ariza topshirish haqida eng ko'p beriladigan savollarga javoblar
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {faqItems.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white open:border-indigo-200 transition-colors"
            >
              <summary className="flex items-center gap-3 cursor-pointer list-none px-4 py-3 select-none">
                <span className="text-xs font-extrabold text-indigo-600 w-6 shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="flex-1 text-sm font-bold text-slate-800">
                  {item.question}
                </h3>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 pl-[52px] text-sm leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
