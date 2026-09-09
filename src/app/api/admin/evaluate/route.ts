import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { calculateFinalResult } from "@/lib/scoring/mcq";
import { z } from "zod";

const questionScoreItem = z.object({
  question: z.number().min(1).max(5),
  status: z.enum(["correct", "incorrect", "untouched"]),
  marks: z.number().min(0).max(4),
});

const evaluateSchema = z.object({
  attemptId: z.string().cuid(),
  questionScores: z.array(questionScoreItem).length(5),
  notes: z.string().max(2000).optional(),
  markEvaluationDone: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { attemptId, questionScores, notes, markEvaluationDone } = parsed.data;

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { practicalSubmission: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const totalPracticalScore = questionScores.reduce((sum, q) => sum + q.marks, 0);

    if (attempt.practicalSubmission) {
      await prisma.practicalSubmission.update({
        where: { attemptId },
        data: {
          score: totalPracticalScore,
          questionScores: questionScores as any,
          evaluatorNotes: notes || null,
          evaluatedBy: session!.user?.id,
          evaluatedAt: new Date(),
        },
      });
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { practicalScore: totalPracticalScore },
    });

    const result = await calculateFinalResult(attemptId);

    if (markEvaluationDone) {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          evaluationDone: true,
          evaluationDoneAt: new Date(),
          evaluationDoneBy: session!.user?.email || session!.user?.id,
        },
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Evaluate error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
