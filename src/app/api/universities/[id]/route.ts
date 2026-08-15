import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  universities,
  universityPrograms,
  programRequirements,
  applicationCycles,
  universitySources,
  sources,
  campuses,
  universityImages,
  scholarships,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * University detail API (spec §2-§14).
 * Returns the university plus all related verified data.
 * Missing data stays null — the UI shows "Not available" / "Not specified".
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uniId = parseInt(id, 10);

    const [uni] = await db.select().from(universities).where(eq(universities.id, uniId));
    if (!uni) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    // Programs + their requirements.
    const programs = await db
      .select()
      .from(universityPrograms)
      .where(eq(universityPrograms.universityId, uniId))
      .orderBy(asc(universityPrograms.name));

    const programReqs: Record<number, typeof programRequirements.$inferSelect[]> = {};
    for (const p of programs) {
      const reqs = await db
        .select()
        .from(programRequirements)
        .where(eq(programRequirements.programId, p.id));
      programReqs[p.id] = reqs;
    }

    // Application cycles (spec §2 — multiple rows per university allowed).
    const cycles = await db
      .select()
      .from(applicationCycles)
      .where(eq(applicationCycles.universityId, uniId))
      .orderBy(asc(applicationCycles.cycleYear));

    // Sources: university_sources + linked sources table.
    const uniSourceRows = await db
      .select()
      .from(universitySources)
      .where(eq(universitySources.universityId, uniId));
    const sourceIds = uniSourceRows.map((r) => r.sourceId).filter((x): x is number => x != null);
    const sourceMap = new Map<number, typeof sources.$inferSelect>();
    if (sourceIds.length) {
      const srcRows = await db.select().from(sources);
      srcRows.forEach((s) => sourceMap.set(s.id, s));
    }
    const uniSources = uniSourceRows.map((r) => ({
      ...r,
      source: r.sourceId != null ? sourceMap.get(r.sourceId) ?? null : null,
    }));

    // Scholarships linked to this university (spec §8).
    const uniScholarships = await db
      .select()
      .from(scholarships)
      .where(eq(scholarships.universityId, uniId))
      .orderBy(asc(scholarships.title));

    const campusRows = await db
      .select()
      .from(campuses)
      .where(eq(campuses.universityId, uniId));

    const images = await db
      .select()
      .from(universityImages)
      .where(eq(universityImages.universityId, uniId));

    return NextResponse.json({
      university: uni,
      programs: programs.map((p) => ({ ...p, requirements: programReqs[p.id] || [] })),
      cycles,
      sources: uniSources,
      scholarships: uniScholarships,
      campuses: campusRows,
      images,
    });
  } catch (error) {
    console.error("GET /api/universities/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch university" }, { status: 500 });
  }
}
