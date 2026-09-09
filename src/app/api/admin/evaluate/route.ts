import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { practicalScoreSchema } from "@/lib/validation/schemas";
import { calculateFinalResult } from "@/lib/scoring/mcq";

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = practicalScoreSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { attemptId, score, notes } = parsed.data;

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { practicalSubmission: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Update practical score
    if (attempt.practicalSubmission) {
      await prisma.practicalSubmission.update({
        where: { attemptId },
        data: {
          score,
          evaluatorNotes: notes || null,
          evaluatedBy: session!.user?.id,
          evaluatedAt: new Date(),
        },
      });
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { practicalScore: score },
    });

    // Calculate final result
    const result = await calculateFinalResult(attemptId);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Evaluate error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
