export interface StudentProfileData {
  id?: number;
  name?: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: number;
  gpaScale: number;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  greScore?: number | null;
  budgetAnnualUsd: number;
  preferredCountries?: string | string[];
  needScholarship: boolean;
  extracurriculars?: string | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
}

export interface UniversityData {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number;
  degreeLevel: string;
  programMajor: string;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  acceptanceRate?: number | null;
  postStudyWorkVisaYears?: number | null;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl?: string | null;
}

export interface ScholarshipData {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number;
  deadline: string;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa?: number | null;
  minIelts?: number | null;
  financialNeedBased?: boolean | null;
  meritBased?: boolean | null;
  description: string;
  requirements: string;
  websiteUrl: string;
}

export function calculateUniversityMatch(profile: StudentProfileData, uni: UniversityData) {
  let score = 70;
  // Weighted reasons/issues — ranked by importance so the UI can show the
  // 2 most important + and the 2 biggest − (spec §23 — explain the score).
  const reasons: { text: string; weight: number }[] = [];
  const potentialIssues: { text: string; weight: number }[] = [];

  // Normalize GPA to 4.0 scale (spec §23 — explain the score)
  const normGpa = Math.min(4.0, profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa);

  // GPA — only when the university officially specifies a minimum (spec §14).
  if (uni.minGpa != null) {
    const gpaDiff = normGpa - uni.minGpa;
    if (gpaDiff >= 0.5) {
      score += 15;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} well above the ${uni.minGpa} minimum`, weight: 15 });
    } else if (gpaDiff >= 0.2) {
      score += 10;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} above the ${uni.minGpa} minimum`, weight: 10 });
    } else if (gpaDiff >= 0) {
      score += 5;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} meets the ${uni.minGpa} minimum`, weight: 5 });
    } else if (gpaDiff >= -0.3) {
      score -= 12;
      potentialIssues.push({ text: `GPA ${normGpa.toFixed(2)} slightly below the ${uni.minGpa} minimum`, weight: 12 });
    } else {
      score -= 25;
      potentialIssues.push({ text: `GPA ${normGpa.toFixed(2)} is below the ${uni.minGpa} requirement`, weight: 25 });
    }
  }

  // Language Requirement (IELTS) — a missing test is a real penalty:
  // a university that requires IELTS must NEVER show a 98% match for a
  // student without an IELTS score (spec §23, §19).
  if (uni.minIelts != null) {
    const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
    if (!hasIelts) {
      score -= 25;
      potentialIssues.push({
        text: `IELTS ${uni.minIelts} required — you don't have an IELTS score yet`,
        weight: 25,
      });
    } else if (profile.ieltsScore! >= uni.minIelts + 0.5) {
      score += 8;
      reasons.push({ text: `IELTS ${profile.ieltsScore} above the ${uni.minIelts} requirement`, weight: 8 });
    } else if (profile.ieltsScore! >= uni.minIelts) {
      score += 4;
      reasons.push({ text: `IELTS ${profile.ieltsScore} meets the ${uni.minIelts} requirement`, weight: 4 });
    } else {
      score -= 20;
      potentialIssues.push({
        text: `IELTS ${uni.minIelts} required — you have ${profile.ieltsScore}`,
        weight: 20,
      });
    }
  }

  // SAT — only when the university officially specifies a minimum.
  if (uni.minSat != null) {
    const hasSat = typeof profile.satScore === "number" && profile.satScore > 0;
    if (!hasSat) {
      score -= 20;
      potentialIssues.push({
        text: `SAT ${uni.minSat} required — you don't have an SAT score yet`,
        weight: 20,
      });
    } else if (profile.satScore! >= uni.minSat) {
      score += 6;
      reasons.push({ text: `SAT ${profile.satScore} meets the ${uni.minSat} requirement`, weight: 6 });
    } else {
      score -= 15;
      potentialIssues.push({
        text: `SAT ${uni.minSat} required — you have ${profile.satScore}`,
        weight: 15,
      });
    }
  }

  // Budget Alignment — only when tuition data is verified AND the profile has a budget
  // (NULL ≠ $0, spec §16; nullable budget must never crash formatting).
  if (
    uni.annualTuitionUsd != null &&
    profile.budgetAnnualUsd != null &&
    Number.isFinite(profile.budgetAnnualUsd)
  ) {
    const totalUniCost = uni.annualTuitionUsd + (uni.annualLivingEstUsd ?? 0);
    if (profile.budgetAnnualUsd >= totalUniCost) {
      score += 10;
      reasons.push({ text: `Estimated cost $${totalUniCost.toLocaleString()}/yr fits your budget`, weight: 10 });
    } else {
      const budgetDeficit = totalUniCost - profile.budgetAnnualUsd;
      const weight = budgetDeficit > 30000 && !profile.needScholarship ? 20 : 10;
      score -= weight;
      potentialIssues.push({
        text: `Estimated cost $${totalUniCost.toLocaleString()}/yr exceeds your $${profile.budgetAnnualUsd.toLocaleString()} budget`,
        weight,
      });
    }
  }

  // Preferred Country Boost
  let preferredList: string[] = [];
  try {
    if (typeof profile.preferredCountries === "string") {
      preferredList = JSON.parse(profile.preferredCountries);
    } else if (Array.isArray(profile.preferredCountries)) {
      preferredList = profile.preferredCountries;
    }
  } catch {
    preferredList = [];
  }

  if (preferredList.some(c => c.toLowerCase() === uni.country.toLowerCase())) {
    score += 8;
    reasons.push({ text: `${uni.country} is on your preferred list`, weight: 8 });
  }

  // Research / Work Experience Boost for Master/PhD or top ranking
  if ((profile.researchPublications || 0) > 0 || (profile.workExperienceYears || 0) > 0) {
    score += 5;
    reasons.push({ text: "Research / work experience strengthens your application", weight: 5 });
  }

  // Clamp Score
  const matchScore = Math.min(99, Math.max(35, Math.round(score)));

  // Categorize
  let matchCategory: "Reach" | "Match" | "Safety" = "Match";
  if (matchScore >= 85) {
    matchCategory = "Safety";
  } else if (matchScore >= 68) {
    matchCategory = "Match";
  } else {
    matchCategory = "Reach";
  }

  // Ranked output: the 2 most important positives and the 2 biggest
  // negatives — a missing requirement is always visible as a "−".
  reasons.sort((a, b) => b.weight - a.weight);
  potentialIssues.sort((a, b) => b.weight - a.weight);

  return {
    matchScore,
    matchCategory,
    reasons: reasons.slice(0, 2).map(r => r.text),
    potentialIssues: potentialIssues.slice(0, 2).map(i => i.text),
  };
}

export function calculateScholarshipMatch(profile: StudentProfileData, scholarship: ScholarshipData) {
  let score = 65;
  const reasons: string[] = [];
  const potentialIssues: string[] = [];

  // GPA check (spec §22 — explain WHY it matches)
  const normGpa = Math.min(4.0, profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa);
  if (scholarship.minGpa) {
    if (normGpa >= scholarship.minGpa + 0.4) {
      score += 15;
      reasons.push(`GPA ${normGpa.toFixed(2)} well above the ${scholarship.minGpa} minimum`);
    } else if (normGpa >= scholarship.minGpa) {
      score += 8;
      reasons.push(`GPA ${normGpa.toFixed(2)} meets the ${scholarship.minGpa} minimum`);
    } else {
      score -= 20;
      potentialIssues.push(`GPA ${normGpa.toFixed(2)} is below the ${scholarship.minGpa} requirement`);
    }
  }

  // IELTS check
  if (scholarship.minIelts && profile.ieltsScore) {
    if (profile.ieltsScore >= scholarship.minIelts) {
      score += 10;
      reasons.push(`IELTS ${profile.ieltsScore} meets the ${scholarship.minIelts} requirement`);
    } else {
      score -= 15;
      potentialIssues.push(`IELTS ${profile.ieltsScore} is below the ${scholarship.minIelts} minimum`);
    }
  }

  // Degree Level alignment (NULL-safe: JSON.parse(null) returns null, not []).
  let levels: string[] = [];
  try {
    const parsed = scholarship.degreeLevels ? JSON.parse(scholarship.degreeLevels) : [];
    levels = Array.isArray(parsed) ? parsed : [];
  } catch {
    levels = [];
  }
  if (levels.length > 0) {
    if (levels.includes("All") || levels.some(l => l.toLowerCase() === profile.degreeLevel.toLowerCase())) {
      score += 10;
      reasons.push(`Open to ${profile.degreeLevel} applicants`);
    } else {
      score -= 25;
      potentialIssues.push(`Only open to: ${levels.join(", ")}`);
    }
  }

  // Eligible majors (spec §22)
  try {
    const parsed = scholarship.eligibleMajors ? JSON.parse(scholarship.eligibleMajors) : [];
    const majors: string[] = Array.isArray(parsed) ? parsed : [];
    if (majors.length && !majors.includes("All")) {
      const matchMajor = majors.some((m) =>
        m.toLowerCase().includes(profile.targetMajor.toLowerCase().split(" ")[0]) ||
        profile.targetMajor.toLowerCase().includes(m.toLowerCase())
      );
      if (matchMajor) {
        score += 8;
        reasons.push(`Your field (${profile.targetMajor}) is eligible`);
      } else {
        score -= 10;
        potentialIssues.push(`Field limited to: ${majors.join(", ")}`);
      }
    }
  } catch {
    // fallback
  }

  // Need based vs profile budget
  if (scholarship.financialNeedBased && profile.needScholarship) {
    score += 10;
    reasons.push("Need-based — matches your scholarship requirement");
  }

  // Merit based vs GPA & Publications
  if (scholarship.meritBased) {
    if (normGpa >= 3.6 || (profile.researchPublications || 0) > 0) {
      score += 10;
      reasons.push("Merit-based — strong academic record / publications");
    }
  }

  const matchScore = Math.min(98, Math.max(30, Math.round(score)));
  const isEligible = matchScore >= 60;

  return { matchScore, isEligible, reasons: reasons.slice(0, 4), potentialIssues: potentialIssues.slice(0, 3) };
}
