import { db } from "./index";
import {
  studentProfiles,
  universities,
  scholarships,
  savedUniversities,
  savedScholarships,
  applicationTasks,
  forumCategories,
  forumThreads,
  courses,
  courseModules,
  lessons,
  quizzes,
  quizQuestions,
  levels,
  badges,
} from "./schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if universities already seeded
    const existingUnis = await db.select().from(universities).limit(1);
    if (existingUnis.length > 0) {
      return;
    }

    console.log("Seeding database with ScholarBridge dataset...");

    // Insert Default Universities
    const insertedUnis = await db.insert(universities).values([
      {
        name: "Massachusetts Institute of Technology (MIT)",
        country: "United States",
        city: "Cambridge, MA",
        flagEmoji: "🇺🇸",
        worldRanking: 1,
        degreeLevel: "All",
        programMajor: "Computer Science & Artificial Intelligence",
        annualTuitionUsd: 59750,
        annualLivingEstUsd: 21000,
        minGpa: 3.85,
        minIelts: 7.5,
        minSat: 1530,
        acceptanceRate: 4.8,
        postStudyWorkVisaYears: 3.0,
        description: "World leader in technology, AI research, and engineering. MIT provides cutting-edge labs, startup incubators, and unmatched industry connections.",
        highlights: JSON.stringify(["OPT STEM 3-Year Extension", "World #1 CS Program", "Generous Need-Blind Aid", "CSAIL Research Lab"]),
        websiteUrl: "https://www.mit.edu",
        imageUrl: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "University of Oxford",
        country: "United Kingdom",
        city: "Oxford",
        flagEmoji: "🇬🇧",
        worldRanking: 3,
        degreeLevel: "Master",
        programMajor: "Advanced Computer Science & Data Science",
        annualTuitionUsd: 41200,
        annualLivingEstUsd: 18500,
        minGpa: 3.75,
        minIelts: 7.5,
        minSat: 1480,
        acceptanceRate: 14.2,
        postStudyWorkVisaYears: 2.0,
        description: "Historic university renowned for academic excellence, tutorial system, and world-class AI and machine learning departments.",
        highlights: JSON.stringify(["UK Graduate Route 2-Yr Visa", "Rhodes & Clarendon Scholarships", "College Tutorial System", "DeepMind Chair Hub"]),
        websiteUrl: "https://www.ox.ac.uk",
        imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "Technical University of Munich (TUM)",
        country: "Germany",
        city: "Munich",
        flagEmoji: "🇩🇪",
        worldRanking: 28,
        degreeLevel: "Master",
        programMajor: "Informatics & Data Engineering",
        annualTuitionUsd: 3200,
        annualLivingEstUsd: 13500,
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1280,
        acceptanceRate: 22.5,
        postStudyWorkVisaYears: 1.5,
        description: "Europe's leading technical university with virtually free/low tuition, top European industry partnerships (BMW, Siemens, Google Munich), and English-taught Master's.",
        highlights: JSON.stringify(["Ultra Low Tuition Fees", "18-Month Post-Study Job Seeker Visa", "Strong Tech Ecosystem", "DAAD Eligible"]),
        websiteUrl: "https://www.tum.de",
        imageUrl: "https://images.unsplash.com/photo-1592285853127-6f62b210f8a8?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "University of Toronto",
        country: "Canada",
        city: "Toronto, ON",
        flagEmoji: "🇨🇦",
        worldRanking: 21,
        degreeLevel: "All",
        programMajor: "Applied Computing & Software Engineering",
        annualTuitionUsd: 38500,
        annualLivingEstUsd: 16000,
        minGpa: 3.4,
        minIelts: 7.0,
        minSat: 1380,
        acceptanceRate: 43.0,
        postStudyWorkVisaYears: 3.0,
        description: "Canada's top research university offering PGWP up to 3 years, direct pathways to Canadian Permanent Residency, and premier Vector Institute AI partnerships.",
        highlights: JSON.stringify(["3-Year Post-Graduation Work Permit (PGWP)", "Express Entry PR Bonus Points", "Vector Institute AI Hub", "Co-op Internship Options"]),
        websiteUrl: "https://www.utoronto.ca",
        imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "National University of Singapore (NUS)",
        country: "Singapore",
        city: "Singapore",
        flagEmoji: "🇸🇬",
        worldRanking: 8,
        degreeLevel: "All",
        programMajor: "Business Analytics & AI Systems",
        annualTuitionUsd: 28900,
        annualLivingEstUsd: 14000,
        minGpa: 3.6,
        minIelts: 6.5,
        minSat: 1400,
        acceptanceRate: 16.0,
        postStudyWorkVisaYears: 1.0,
        description: "Asia's premier university located in global financial and technological center with Service Obligation tuition subsidies for international students.",
        highlights: JSON.stringify(["MOE Tuition Grant Subsidy", "Asia #1 University", "Global Fintech & Tech Hub", "SINGA Scholarship Target"]),
        websiteUrl: "https://www.nus.edu.sg",
        imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "ETH Zurich",
        country: "Switzerland",
        city: "Zurich",
        flagEmoji: "🇨🇭",
        worldRanking: 7,
        degreeLevel: "Master",
        programMajor: "Cybersecurity & Machine Learning",
        annualTuitionUsd: 1800,
        annualLivingEstUsd: 24000,
        minGpa: 3.7,
        minIelts: 7.0,
        minSat: 1450,
        acceptanceRate: 18.0,
        postStudyWorkVisaYears: 0.5,
        description: "World-class STEM institution with affordable tuition fees, home to Einstein, and unparalleled research in robotics, quantum computing, and AI.",
        highlights: JSON.stringify(["Low Tuition Fees (~$1.8k/yr)", "Top 10 Global Ranking", "Excellence Scholarship & Opportunity Program", "World-class Labs"]),
        websiteUrl: "https://ethz.ch",
        imageUrl: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "University of Melbourne",
        country: "Australia",
        city: "Melbourne",
        flagEmoji: "🇦🇺",
        worldRanking: 14,
        degreeLevel: "All",
        programMajor: "Information Technology & Data Science",
        annualTuitionUsd: 34500,
        annualLivingEstUsd: 17500,
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1300,
        acceptanceRate: 70.0,
        postStudyWorkVisaYears: 3.0,
        description: "Australia's top university located in one of the world's most liveable cities, offering generous post-study work rights and regional migration bonuses.",
        highlights: JSON.stringify(["3 to 4-Year Temporary Graduate Visa", "Melbourne Tech Hub", "Generous Merit Scholarships", "High Quality of Life"]),
        websiteUrl: "https://www.unimelb.edu.au",
        imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "Stanford University",
        country: "United States",
        city: "Stanford, CA",
        flagEmoji: "🇺🇸",
        worldRanking: 2,
        degreeLevel: "All",
        programMajor: "Artificial Intelligence & Entrepreneurship",
        annualTuitionUsd: 62484,
        annualLivingEstUsd: 22500,
        minGpa: 3.9,
        minIelts: 7.5,
        minSat: 1540,
        acceptanceRate: 3.9,
        postStudyWorkVisaYears: 3.0,
        description: "Silicon Valley's powerhouse university. Unrivaled ecosystem for venture capital, technology commercialization, AI breakthrough labs, and founders.",
        highlights: JSON.stringify(["Knight-Hennessy Scholars Program", "Silicon Valley Venture Access", "3-Year STEM OPT", "Pioneer AI Research"]),
        websiteUrl: "https://www.stanford.edu",
        imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "University of British Columbia (UBC)",
        country: "Canada",
        city: "Vancouver, BC",
        flagEmoji: "🇨🇦",
        worldRanking: 34,
        degreeLevel: "All",
        programMajor: "Data Science & Sustainability Engineering",
        annualTuitionUsd: 36000,
        annualLivingEstUsd: 16500,
        minGpa: 3.3,
        minIelts: 6.5,
        minSat: 1320,
        acceptanceRate: 52.0,
        postStudyWorkVisaYears: 3.0,
        description: "Premier West Coast Canadian university surrounded by mountains and sea, renowned for sustainability, health tech, and AI co-op programs.",
        highlights: JSON.stringify(["3-Year PGWP Work Visa", "Vancouver Tech Hub", "International Leader Award", "Scenic Campus"]),
        websiteUrl: "https://www.ubc.ca",
        imageUrl: "https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "Delft University of Technology (TU Delft)",
        country: "Netherlands",
        city: "Delft",
        flagEmoji: "🇳🇱",
        worldRanking: 47,
        degreeLevel: "Master",
        programMajor: "Computer Science & Renewable Energy Engineering",
        annualTuitionUsd: 21500,
        annualLivingEstUsd: 14000,
        minGpa: 3.3,
        minIelts: 6.5,
        minSat: 1300,
        acceptanceRate: 35.0,
        postStudyWorkVisaYears: 1.0,
        description: "Netherlands' largest technical university with outstanding English-taught Master's degrees, high graduate employability, and 1-year Orientation Year visa.",
        highlights: JSON.stringify(["Dutch Orientation Year Visa", "TU Delft Excellence Scholarship", "High English Proficiency Environment", "EU Tech Innovation Hub"]),
        websiteUrl: "https://www.tudelft.nl",
        imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "Imperial College London",
        country: "United Kingdom",
        city: "London",
        flagEmoji: "🇬🇧",
        worldRanking: 6,
        degreeLevel: "All",
        programMajor: "Computing, AI & Financial Technology",
        annualTuitionUsd: 46500,
        annualLivingEstUsd: 21000,
        minGpa: 3.7,
        minIelts: 7.0,
        minSat: 1460,
        acceptanceRate: 15.0,
        postStudyWorkVisaYears: 2.0,
        description: "STEM and business focused top global university in central London, famous for algorithmic trading, bio-engineering, and deeptech ventures.",
        highlights: JSON.stringify(["Central London Tech Corridor", "President's PhD Scholarships", "2-Year UK Graduate Visa", "Strong FinTech Network"]),
        websiteUrl: "https://www.imperial.ac.uk",
        imageUrl: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?q=80&w=800&auto=format&fit=crop"
      },
      {
        name: "The University of Tokyo",
        country: "Japan",
        city: "Tokyo",
        flagEmoji: "🇯🇵",
        worldRanking: 28,
        degreeLevel: "All",
        programMajor: "Robotics & Information Science",
        annualTuitionUsd: 5200,
        annualLivingEstUsd: 15000,
        minGpa: 3.5,
        minIelts: 6.5,
        minSat: 1350,
        acceptanceRate: 20.0,
        postStudyWorkVisaYears: 2.0,
        description: "Japan's flagship university offering fully English-taught degree tracks (PEAK and USTEP) with government MEXT full scholarships available.",
        highlights: JSON.stringify(["MEXT Full Embassy Scholarship", "Low Tuition (~$5.2k)", "Robotics Capital of the World", "Fast-track Japan PR"]),
        websiteUrl: "https://www.u-tokyo.ac.jp",
        imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop"
      }
    ]).returning();

    // Insert Default Scholarships
    await db.insert(scholarships).values([
      {
        title: "Fulbright Foreign Student Program",
        provider: "United States Department of State",
        country: "United States",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 55000,
        deadline: "2025-10-15",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.3,
        minIelts: 7.0,
        financialNeedBased: true,
        meritBased: true,
        description: "Covers full tuition, living stipend, roundtrip airfare, health insurance, and visa support for international graduate students studying in the USA.",
        requirements: "Bachelor's degree, strong leadership record, 3 recommendation letters, essay of intent, and commitment to return to home country.",
        websiteUrl: "https://foreign.fulbrightonline.org"
      },
      {
        title: "Chevening Scholarship",
        provider: "UK Foreign, Commonwealth & Development Office",
        country: "United Kingdom",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 45000,
        deadline: "2025-11-04",
        degreeLevels: JSON.stringify(["Master"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.2,
        minIelts: 6.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Fully funded 1-year Master's scholarship in the UK for future global leaders and influencers, covering tuition, accommodation, and travel allowance.",
        requirements: "2+ years work experience, clear career plan, undergraduate degree equivalent to UK Upper Second Class, acceptance from a UK university.",
        websiteUrl: "https://www.chevening.org"
      },
      {
        title: "DAAD Development-Related Postgraduate Courses (EPOS)",
        provider: "German Academic Exchange Service (DAAD)",
        country: "Germany",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 32000,
        deadline: "2025-09-30",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["Engineering", "Computer Science", "Public Health", "Environmental Science", "Economics"]),
        minGpa: 3.0,
        minIelts: 6.5,
        financialNeedBased: true,
        meritBased: true,
        description: "Monthly stipend of €934 - €1,200, travel allowance, health insurance, and full tuition coverage for select Master's programs across German universities.",
        requirements: "At least 2 years of relevant professional experience, target country citizenship, academic excellence.",
        websiteUrl: "https://www.daad.de"
      },
      {
        title: "Erasmus Mundus Joint Master Degrees (EMJMD)",
        provider: "European Commission / European Union",
        country: "European Union",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 48000,
        deadline: "2026-01-15",
        degreeLevels: JSON.stringify(["Master"]),
        eligibleMajors: JSON.stringify(["Computer Science", "AI & Data Science", "Biotechnology", "Renewable Energy", "Public Policy"]),
        minGpa: 3.4,
        minIelts: 6.5,
        financialNeedBased: false,
        meritBased: true,
        description: "High-profile international study program across 2 to 3 different European countries with €1,400 monthly living allowance and zero tuition fees.",
        requirements: "Bachelor degree, strong academic transcript, motivation letter, CV in Europass format, 2 reference letters.",
        websiteUrl: "https://erasmus-plus.ec.europa.eu"
      },
      {
        title: "Knight-Hennessy Scholars Program",
        provider: "Stanford University",
        country: "United States",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 90000,
        deadline: "2025-10-08",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.7,
        minIelts: 7.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Fully funds up to 3 years of graduate study at Stanford for students with transformative leadership potential, independence of thought, and civic mindset.",
        requirements: "Must apply to a full-time Stanford graduate degree program concurrently. Requires video submission and leadership essays.",
        websiteUrl: "https://knight-hennessy.stanford.edu"
      },
      {
        title: "Gates Cambridge Scholarship",
        provider: "Bill & Melinda Gates Foundation / Cambridge",
        country: "United Kingdom",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 60000,
        deadline: "2025-12-03",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.8,
        minIelts: 7.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Full-cost scholarship for outstanding applicants from countries outside the UK to pursue a postgraduate degree at the University of Cambridge.",
        requirements: "Outstanding intellectual ability, leadership capacity, commitment to improving the lives of others, match with Cambridge program.",
        websiteUrl: "https://www.gatescambridge.org"
      },
      {
        title: "MEXT Japanese Government Scholarship",
        provider: "Ministry of Education, Culture, Sports, Science (MEXT Japan)",
        country: "Japan",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 28000,
        deadline: "2025-05-20",
        degreeLevels: JSON.stringify(["Bachelor", "Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.2,
        minIelts: 6.0,
        financialNeedBased: false,
        meritBased: true,
        description: "Covers tuition fees, monthly living allowance (~144,000 JPY/month), roundtrip flight ticket, and 6-month preparatory Japanese language course.",
        requirements: "Embassy recommendation or university recommendation, written exam & interview at Japanese embassy.",
        websiteUrl: "https://www.mext.go.jp"
      },
      {
        title: "Lester B. Pearson International Scholarship",
        provider: "University of Toronto",
        country: "Canada",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 50000,
        deadline: "2025-11-30",
        degreeLevels: JSON.stringify(["Bachelor"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.7,
        minIelts: 7.0,
        financialNeedBased: false,
        meritBased: true,
        description: "University of Toronto's most prestigious scholarship for international high school students showing exceptional academic achievement and creativity.",
        requirements: "School nomination required, outstanding leadership traits, application to U of T undergraduate program.",
        websiteUrl: "https://future.utoronto.ca/pearson"
      }
    ]);

    // Insert Default Student Profile
    const [profile] = await db.insert(studentProfiles).values({
      name: "Alex Chen",
      email: "alex.chen@scholarbridge.edu",
      degreeLevel: "Master",
      targetMajor: "Computer Science & Data Science",
      gpa: 3.72,
      gpaScale: 4.0,
      ieltsScore: 7.5,
      toeflScore: 105,
      satScore: 1450,
      greScore: 322,
      budgetAnnualUsd: 28000,
      preferredCountries: JSON.stringify(["United States", "United Kingdom", "Canada", "Germany", "Singapore"]),
      needScholarship: true,
      extracurriculars: "Lead Developer of Campus Open Source Project, Winner of National Hackathon 2024, Undergraduate Research Assistant in ML",
      workExperienceYears: 1,
      researchPublications: 1
    }).returning();

    // Insert saved universities for this student
    if (insertedUnis.length >= 3) {
      await db.insert(savedUniversities).values([
        {
          profileId: profile.id,
          universityId: insertedUnis[2].id, // TUM
          matchCategory: "Safety",
          matchScore: 94,
          status: "Preparing Application",
          notes: "Low tuition fee, excellent AI research group. Preparing German blocked account."
        },
        {
          profileId: profile.id,
          universityId: insertedUnis[3].id, // U of Toronto
          matchCategory: "Match",
          matchScore: 88,
          status: "Shortlisted",
          notes: "3-year PGWP is a huge plus. Vector Institute partnership aligns with ML interest."
        },
        {
          profileId: profile.id,
          universityId: insertedUnis[1].id, // Oxford
          matchCategory: "Reach",
          matchScore: 76,
          status: "Shortlisted",
          notes: "Aspirational target. Need killer SOP and Clarendon scholarship application."
        }
      ]);
    }

    // Insert sample application tasks
    await db.insert(applicationTasks).values([
      {
        profileId: profile.id,
        universityId: insertedUnis[2]?.id || null,
        title: "Draft Statement of Purpose (SOP) tailored for TUM",
        category: "SOP & Essays",
        dueDate: "2025-05-15",
        isCompleted: false,
        priority: "High"
      },
      {
        profileId: profile.id,
        universityId: null,
        title: "Request Recommendation Letter from Dr. Vance (ML Professor)",
        category: "LOR",
        dueDate: "2025-05-01",
        isCompleted: true,
        priority: "High"
      },
      {
        profileId: profile.id,
        universityId: null,
        title: "Order WES Official Academic Transcript Evaluation",
        category: "Document Prep",
        dueDate: "2025-05-20",
        isCompleted: false,
        priority: "Medium"
      },
      {
        profileId: profile.id,
        universityId: insertedUnis[3]?.id || null,
        title: "Submit University of Toronto Online Application Portal",
        category: "Document Prep",
        dueDate: "2025-06-01",
        isCompleted: false,
        priority: "High"
      }
    ]);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: Forum categories
// ---------------------------------------------------------------------------
export async function seedForum() {
  try {
    const existing = await db.select().from(forumCategories).limit(1);
    if (existing.length > 0) return;

    const categories = await db
      .insert(forumCategories)
      .values([
        { name: "University Applications", slug: "applications", description: "Application strategies, deadlines, and document help", sortOrder: 1 },
        { name: "Scholarships & Funding", slug: "scholarships", description: "Find and win scholarships, funding, and financial aid", sortOrder: 2 },
        { name: "Visa & Immigration", slug: "visa", description: "Student visas, work permits, and immigration questions", sortOrder: 3 },
        { name: "Test Prep", slug: "test-prep", description: "IELTS, TOEFL, GRE, SAT preparation tips and resources", sortOrder: 4 },
        { name: "SOP & Essays", slug: "sop-essays", description: "Statement of Purpose, motivation letters, and essay reviews", sortOrder: 5 },
      ])
      .returning();

    const [profile] = await db.select().from(studentProfiles).limit(1);
    if (profile) {
      await db.insert(forumThreads).values({
        categoryId: categories[0].id,
        authorId: profile.id,
        title: "Welcome to ScholarBridge Community! 👋",
        body: "Introduce yourself, share your study-abroad goals, and connect with students applying to top universities worldwide. This is your space to ask questions and get advice from the community.",
        isPinned: true,
        isLocked: false,
        viewCount: 0,
      });
      await db.insert(forumThreads).values({
        categoryId: categories[1].id,
        authorId: profile.id,
        title: "Best fully-funded scholarships for Master's in 2025",
        body: "Let's compile a list of the best fully-funded scholarships for international Master's students. I'll start: Fulbright (US), Chevening (UK), DAAD EPOS (Germany), Erasmus Mundus (EU). Share what you know!",
        isPinned: false,
        isLocked: false,
        viewCount: 0,
      });
    }
  } catch (error) {
    console.error("Error seeding forum:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: Courses, modules, lessons, quizzes
// ---------------------------------------------------------------------------
export async function seedCourses() {
  try {
    const existing = await db.select().from(courses).limit(1);
    if (existing.length > 0) return;

    const [course] = await db
      .insert(courses)
      .values({
        title: "Mastering Your Study Abroad Application",
        description: "A step-by-step video course covering university selection, SOP writing, scholarships, and visa preparation — from zero to submission-ready application.",
        instructorName: "Dr. Elena Carter",
        level: "Beginner",
        thumbnailUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
        isPublished: true,
      })
      .returning();

    const [mod1] = await db
      .insert(courseModules)
      .values({ courseId: course.id, title: "Foundation & Planning", description: "Build your application roadmap", sortOrder: 1 })
      .returning();
    const [mod2] = await db
      .insert(courseModules)
      .values({ courseId: course.id, title: "Writing & Documents", description: "SOP, CV and recommendation letters", sortOrder: 2 })
      .returning();
    const [mod3] = await db
      .insert(courseModules)
      .values({ courseId: course.id, title: "Funding & Visa", description: "Scholarships and student visa essentials", sortOrder: 3 })
      .returning();

    const lessonDefs = [
      { moduleId: mod1.id, title: "Choosing the Right University & Program", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", durationSeconds: 45, content: "Learn how to evaluate universities by ranking, program fit, cost, post-study work opportunities, and acceptance rates." },
      { moduleId: mod1.id, title: "Building Your Application Timeline", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", durationSeconds: 40, content: "A month-by-month timeline from research to final submission, including test registration and document deadlines." },
      { moduleId: mod2.id, title: "Writing a Winning Statement of Purpose", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", durationSeconds: 50, content: "Structure your SOP with a strong hook, academic foundation, projects, why-this-university, and future vision." },
      { moduleId: mod2.id, title: "Strong CVs & Recommendation Letters", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", durationSeconds: 42, content: "Format your CV for international review and request compelling recommendation letters from professors." },
      { moduleId: mod3.id, title: "Scholarship Strategy for International Students", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4", durationSeconds: 48, content: "Discover fully-funded scholarships and how to align your profile for merit and need-based awards." },
      { moduleId: mod3.id, title: "Student Visa Interview Preparation", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", durationSeconds: 46, content: "Master common student visa questions, financial proof requirements, and confidence-building interview tips." },
    ];

    const insertedLessons = await db.insert(lessons).values(lessonDefs).returning();

    // Add a quiz to each lesson.
    const quizDefs = insertedLessons.map((lesson, idx) => ({
      lessonId: lesson.id,
      title: `Lesson ${idx + 1} Quiz`,
      passThreshold: 70,
    }));
    const insertedQuizzes = await db.insert(quizzes).values(quizDefs).returning();

    const questionSets: { quizId: number; question: string; options: string[]; correctOptionIndex: number }[] = [];
    insertedQuizzes.forEach((quiz, idx) => {
      const base = idx + 1;
      questionSets.push({
        quizId: quiz.id,
        question: `Sample question ${base} — what is the key to a successful study-abroad application?`,
        options: ["Start early with a clear timeline", "Apply only to one university", "Skip the SOP", "Ignore deadlines"],
        correctOptionIndex: 0,
      });
      questionSets.push({
        quizId: quiz.id,
        question: `Sample question ${base}b — which document is essential for most applications?`,
        options: ["Statement of Purpose", "A flight ticket", "A job offer", "A gym membership"],
        correctOptionIndex: 0,
      });
    });

    await db.insert(quizQuestions).values(
      questionSets.map((q) => ({
        quizId: q.quizId,
        question: q.question,
        options: JSON.stringify(q.options),
        correctOptionIndex: q.correctOptionIndex,
        sortOrder: 1,
      }))
    );
  } catch (error) {
    console.error("Error seeding courses:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: Gamification levels & badges
// ---------------------------------------------------------------------------
export async function seedGamification() {
  try {
    const existingLevels = await db.select().from(levels).limit(1);
    if (existingLevels.length === 0) {
      await db.insert(levels).values([
        { name: "Explorer", minPoints: 0, iconUrl: "🌱" },
        { name: "Scholar", minPoints: 100, iconUrl: "🎓" },
        { name: "Achiever", minPoints: 250, iconUrl: "🏆" },
        { name: "Ambassador", minPoints: 500, iconUrl: "🌟" },
      ]);
    }

    const existingBadges = await db.select().from(badges).limit(1);
    if (existingBadges.length === 0) {
      await db.insert(badges).values([
        { name: "Rising Star", description: "Earn your first 50 points", iconUrl: "⭐", criteria: "points:50" },
        { name: "Century Club", description: "Reach 100 points", iconUrl: "💯", criteria: "points:100" },
        { name: "Course Graduate", description: "Complete your first course", iconUrl: "🎖️", criteria: "course:1" },
        { name: "Profile Pro", description: "Complete 90% of your student profile", iconUrl: "📋", criteria: "profile:complete" },
        { name: "Connector", description: "Successfully refer a friend", iconUrl: "🤝", criteria: "referral:1" },
      ]);
    }
  } catch (error) {
    console.error("Error seeding gamification:", error);
  }
}
