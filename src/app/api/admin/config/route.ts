import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { assessmentConfigSchema } from "@/lib/validation/schemas";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const assessment = await prisma.assessment.findFirst({ where: { active: true } });
  if (!assessment) {
    return NextResponse.json({ error: "No active assessment" }, { status: 404 });
  }

  return NextResponse.json({
    id: assessment.id,
    name: assessment.name,
    durationMins: assessment.durationMins,
    mcqPassingScore: assessment.mcqPassingScore,
    practicalPassingScore: assessment.practicalPassingScore,
    overallPassingScore: assessment.overallPassingScore,
    totalMcqMarks: assessment.totalMcqMarks,
    totalPracticalMarks: assessment.totalPracticalMarks,
  });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = assessmentConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const assessment = await prisma.assessment.findFirst({ where: { active: true } });
    if (!assessment) {
      return NextResponse.json({ error: "No active assessment" }, { status: 404 });
    }

    const updated = await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        ...(parsed.data.durationMins !== undefined && { durationMins: parsed.data.durationMins }),
        ...(parsed.data.mcqPassingScore !== undefined && { mcqPassingScore: parsed.data.mcqPassingScore }),
        ...(parsed.data.practicalPassingScore !== undefined && { practicalPassingScore: parsed.data.practicalPassingScore }),
        ...(parsed.data.overallPassingScore !== undefined && { overallPassingScore: parsed.data.overallPassingScore }),
      },
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (err) {
    console.error("Config update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
