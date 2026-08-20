import { calculateUniversityMatch } from "/home/user/ScholarBridgeAi/src/lib/matching";

const uni = {
  id: 23,
  name: "Imperial College London",
  country: "United Kingdom",
  city: "London",
  flagEmoji: "🇬🇧",
  worldRanking: 2,
  degreeLevel: "Bachelor",
  programMajor: "Computing",
  annualTuitionUsd: 45500,
  annualLivingEstUsd: 18200,
  minGpa: 3.5,
  minIelts: 6.5,
  minSat: 1400,
  acceptanceRate: 11,
  postStudyWorkVisaYears: 2,
  description: "x",
  highlights: "[]",
  websiteUrl: "https://imperial.ac.uk",
} as any;

const baseProfile = {
  degreeLevel: "Bachelor",
  targetMajor: "Computing",
  gpa: 3.8,
  gpaScale: 4.0,
  budgetAnnualUsd: 70000,
  preferredCountries: ["United Kingdom"],
  needScholarship: false,
  workExperienceYears: 0,
  researchPublications: 0,
} as any;

let fails = 0;
function check(label: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${ok ? "" : ` — expected ${JSON.stringify(expected)}`}`);
}

// 1. NO IELTS, NO SAT → big penalties, low score, issues shown
const noTests = calculateUniversityMatch({ ...baseProfile }, uni);
check("1. no IELTS/SAT score drops from 98-style to:", noTests.matchScore < 75, true);
check("1. matchScore exact (70+10-25-20+10+8)", noTests.matchScore, 53);
check("1. category Reach", noTests.matchCategory, "Reach");
check("1. issue mentions IELTS required + no score", noTests.potentialIssues.some((i: string) => /IELTS 6.5 required — you don't have an IELTS score/.test(i)), true);
check("1. issue mentions SAT required + no score", noTests.potentialIssues.some((i: string) => /SAT 1400 required — you don't have an SAT score/.test(i)), true);

// 2. IELTS 5.0 (below 6.5) + no SAT → both negatives shown
const lowIelts = calculateUniversityMatch({ ...baseProfile, ieltsScore: 5.0 }, uni);
check("2. IELTS below → penalty", lowIelts.matchScore < 70, true);
check("2. issue says 'IELTS 6.5 required — you have 5'", lowIelts.potentialIssues.some((i: string) => /IELTS 6.5 required — you have 5/.test(i)), true);
check("2. SAT missing issue present", lowIelts.potentialIssues.some((i: string) => /SAT 1400 required/.test(i)), true);

// 3. IELTS 7.5 + SAT 1500 + GPA 3.8 + budget + country → high score, 2 positives
const strong = calculateUniversityMatch({ ...baseProfile, ieltsScore: 7.5, satScore: 1500 }, uni);
check("3. strong profile high score", strong.matchScore >= 80, true);
  check("3. top-2 reasons: GPA first (weight 15)", strong.reasons[0].includes("GPA 3.80 above the 3.5 minimum"), true);
  check("3. top-2 reasons: budget second (weight 10)", strong.reasons[1].includes("fits your budget"), true);
check("3. max 2 reasons", strong.reasons.length <= 2, true);
check("3. max 2 issues", strong.potentialIssues.length <= 2, true);

// 4. IELTS exactly 6.5 → meets (no penalty)
const exact = calculateUniversityMatch({ ...baseProfile, ieltsScore: 6.5, satScore: 1450 }, uni);
check("4. IELTS meets → no IELTS issue", exact.potentialIssues.some((i: string) => /IELTS/.test(i)), false);

// 5. university with NO IELTS/SAT requirement → no penalty for missing tests
const uniNoReqs = { ...uni, minIelts: null, minSat: null };
const noReqs = calculateUniversityMatch({ ...baseProfile }, uniNoReqs);
check("5. no reqs → no test issues", noReqs.potentialIssues.some((i: string) => /IELTS|SAT/.test(i)), false);
check("5. score unaffected high", noReqs.matchScore >= 85, true);

console.log(fails === 0 ? "\nALL MATCH TESTS PASSED" : `\n${fails} FAILED`);
process.exit(fails ? 1 : 0);
