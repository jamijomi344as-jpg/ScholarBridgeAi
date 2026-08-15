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
  annualTuitionUsd: number;
  annualLivingEstUsd: number;
  minGpa: number;
  minIelts: number;
  minSat?: number | null;
  acceptanceRate: number;
  postStudyWorkVisaYears: number;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl: string;
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
  const reasons: string[] = [];
  const potentialIssues: string[] = [];

  // Normalize GPA to 4.0 scale (spec §23 — explain the score)
  const normGpa = profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa;
  const gpaDiff = normGpa - uni.minGpa;

  if (gpaDiff >= 0.5) {
    score += 15;
    reasons.push(`GPA ${normGpa.toFixed(2)} well above the ${uni.minGpa} minimum`);
  } else if (gpaDiff >= 0.2) {
    score += 10;
    reasons.push(`GPA ${normGpa.toFixed(2)} above the ${uni.minGpa} minimum`);
  } else if (gpaDiff >= 0) {
    score += 5;
    reasons.push(`GPA ${normGpa.toFixed(2)} meets the ${uni.minGpa} minimum`);
  } else if (gpaDiff >= -0.3) {
    score -= 12;
    potentialIssues.push(`GPA ${normGpa.toFixed(2)} slightly below the ${uni.minGpa} minimum`);
  } else {
    score -= 25;
    potentialIssues.push(`GPA ${normGpa.toFixed(2)} is below the ${uni.minGpa} requirement`);
  }

  // Language Requirement Check
  if (profile.ieltsScore && uni.minIelts) {
    if (profile.ieltsScore >= uni.minIelts + 0.5) {
      score += 8;
      reasons.push(`IELTS ${profile.ieltsScore} above the ${uni.minIelts} requirement`);
    } else if (profile.ieltsScore >= uni.minIelts) {
      score += 4;
      reasons.push(`IELTS ${profile.ieltsScore} meets the ${uni.minIelts} requirement`);
    } else {
      score -= 15;
      potentialIssues.push(`IELTS ${profile.ieltsScore} below the ${uni.minIelts} minimum`);
    }
  }

  // Budget Alignment
  const totalUniCost = uni.annualTuitionUsd + uni.annualLivingEstUsd;
  if (profile.budgetAnnualUsd >= totalUniCost) {
    score += 10;
    reasons.push(`Estimated cost $${totalUniCost.toLocaleString()}/yr fits your budget`);
  } else {
    const budgetDeficit = totalUniCost - profile.budgetAnnualUsd;
    potentialIssues.push(
      `Estimated cost $${totalUniCost.toLocaleString()}/yr exceeds your $${profile.budgetAnnualUsd.toLocaleString()} budget`
    );
    if (budgetDeficit > 30000 && !profile.needScholarship) {
      score -= 20;
    } else if (budgetDeficit > 15000) {
      score -= 10;
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
    reasons.push(`${uni.country} is on your preferred list`);
  }

  // Research / Work Experience Boost for Master/PhD or top ranking
  if ((profile.researchPublications || 0) > 0 || (profile.workExperienceYears || 0) > 0) {
    score += 5;
    reasons.push("Research / work experience strengthens your application");
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

  return {
    matchScore,
    matchCategory,
    reasons: reasons.slice(0, 4),
    potentialIssues: potentialIssues.slice(0, 3),
  };
}

export function calculateScholarshipMatch(profile: StudentProfileData, scholarship: ScholarshipData) {
  let score = 65;
  const reasons: string[] = [];
  const potentialIssues: string[] = [];

  // GPA check (spec §22 — explain WHY it matches)
  const normGpa = profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa;
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

  // Degree Level alignment
  try {
    const levels: string[] = JSON.parse(scholarship.degreeLevels);
    if (levels.includes("All") || levels.some(l => l.toLowerCase() === profile.degreeLevel.toLowerCase())) {
      score += 10;
      reasons.push(`Open to ${profile.degreeLevel} applicants`);
    } else {
      score -= 25;
      potentialIssues.push(`Only open to: ${levels.join(", ")}`);
    }
  } catch {
    // fallback
  }

  // Eligible majors (spec §22)
  try {
    const majors: string[] = JSON.parse(scholarship.eligibleMajors || "[]");
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
