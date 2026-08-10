import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { callGemini } from "@/lib/gemini";
import { eq } from "drizzle-orm";
import { localeToLanguageName } from "@/i18n/config";

export async function POST(req: Request) {
  try {
    const { message, profileId, chatHistory } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let profileContext = "";
    let languageInstruction = "";
    if (profileId) {
      const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
      if (profile) {
        languageInstruction = `IMPORTANT: Respond to the student entirely in ${localeToLanguageName(profile.preferredLocale || "en")}. Keep the technical terms where they are clearer, but write your explanation in the student's language.\n`;
        profileContext = `STUDENT CONTEXT:
- Name: ${profile.name}
- Target Level: ${profile.degreeLevel}
- Target Major: ${profile.targetMajor}
- GPA: ${profile.gpa}/${profile.gpaScale}
- IELTS/TOEFL: ${profile.ieltsScore || profile.toeflScore || "Not set"}
- Budget: $${profile.budgetAnnualUsd}/year
- Countries: ${profile.preferredCountries}
- Scholarship needed: ${profile.needScholarship ? "Yes" : "No"}`;
      }
    }

    const systemInstruction = `${languageInstruction}You are ScholarBridge AI, an expert, encouraging, and knowledgeable study-abroad counselor.
You guide students on international university selection, scholarships (Fulbright, Chevening, DAAD, Erasmus, etc.), SOP writing, LOR requests, IELTS/GRE strategy, post-study work visas (OPT, PGWP, UK Graduate Visa, Germany Job Seeker), and financial proof.
Be concise, practical, well-formatted with markdown lists, bold text, and clear bullet points.
${profileContext}`;

    let historyText = "";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyText = chatHistory
        .slice(-6)
        .map((h: { sender: string; text: string }) => `${h.sender === "user" ? "User" : "ScholarBridge AI"}: ${h.text}`)
        .join("\n");
    }

    const fullPrompt = `${historyText ? "CONVERSATION HISTORY:\n" + historyText + "\n\n" : ""}User Question: ${message}`;

    let reply = await callGemini(fullPrompt, systemInstruction);

    if (!reply) {
      // Intelligent fallback responses based on query topic
      const queryLower = message.toLowerCase();

      if (queryLower.includes("visa") || queryLower.includes("work permit") || queryLower.includes("opt") || queryLower.includes("pgwp")) {
        reply = `### 🌐 International Post-Study Work Visas Overview

Here is how top study destinations compare regarding post-graduation work opportunities:

1. **🇨🇦 Canada (PGWP):** Up to **3 Years** work permit upon completing a 2-year degree program. Direct points for Express Entry PR.
2. **🇺🇸 United States (OPT / STEM OPT):** 1 year standard OPT + **2 additional years extension** for STEM majors (3 years total!).
3. **🇬🇧 United Kingdom (Graduate Route):** **2 Years** post-study work visa for Master's/Bachelor's and 3 years for PhD graduates.
4. **🇩🇪 Germany (Job Seeker Visa):** **18 Months** residence permit to search for a job in line with your degree. Fast-track permanent residency in 21-24 months.
5. **🇦🇺 Australia (Temporary Graduate Visa Subclass 485):** **2 to 4 Years** depending on degree level and regional campus location.

💡 **Pro Tip:** Make sure your target major is officially classified under **STEM (Science, Tech, Engineering, Math)** if applying to the US!`;
      } else if (queryLower.includes("scholarship") || queryLower.includes("funding") || queryLower.includes("tuition")) {
        reply = `### 💰 High-Value Full Scholarships for International Students

Here are top fully-funded scholarships aligned with your target profile:

* **🇺🇸 Fulbright Foreign Student Program:** Full tuition, monthly stipend, health insurance, airfare to USA.
* **🇬🇧 Chevening Scholarship:** Fully funded 1-year Master's in the UK, including fees, living stipend, and travel.
* **🇩🇪 DAAD EPOS / TUM Merit Grants:** Complete tuition coverage + €934-€1,200 monthly allowance in Germany.
* **🇪🇺 Erasmus Mundus Joint Master:** €1,400/month stipend + zero tuition across multiple European capitals.
* **🇯🇵 MEXT Japanese Government:** 144,000 JPY/month stipend, 100% tuition coverage, flight allowance.

💡 **Key Deadline Reminder:** Most major government scholarships close application portals **6 to 9 months BEFORE** the academic intake starts!`;
      } else if (queryLower.includes("sop") || queryLower.includes("essay") || queryLower.includes("statement")) {
        reply = `### ✍️ Winning SOP Structure (5-Step Framework)

To write a compelling Statement of Purpose that stands out to committee members:

1. **Hook Paragraph (10%):** Start with a specific problem or real-world challenge that ignited your interest in your field.
2. **Academic Foundations (25%):** Highlight core undergraduate courses, top grades, and key concepts mastered.
3. **Projects & Industry Impact (30%):** Detail hands-on software/research projects, metrics achieved, and problem-solving skills.
4. **Why This University (20%):** Mention specific faculty members, specialized labs, and 2 exact elective modules!
5. **Future Vision (15%):** Articulate 3-year and 10-year post-graduation career goals.

Need help generating a draft? Use our **AI SOP Assistant** in the main menu!`;
      } else {
        reply = `### 🎓 ScholarBridge AI Guidance

Thank you for your question regarding **"${message}"**!

Here are key action items to keep in mind:

1. **Profile Calibration:** Ensure your GPA, IELTS/TOEFL scores, and annual budget match target university cutoffs.
2. **Document Readiness:** Secure official university transcripts, 2-3 academic recommendation letters (LORs), and an updated Europass or Harvard-format CV.
3. **Application Deadlines:** Fall intake applications typically open in September and close between December and March.

You can use the **University Explorer** to compare tuition and acceptance rates, or use our **AI Profile Evaluator** for an in-depth readiness breakdown!`;
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
