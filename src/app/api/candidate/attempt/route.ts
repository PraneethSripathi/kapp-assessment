import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate: { select: { id: true, name: true, email: true, role: true } },
      assessment: {
        select: {
          id: true, name: true, instructions: true, durationMins: true,
          totalMcqMarks: true, totalPracticalMarks: true,
        },
      },
      questionSet: { select: { id: true, code: true, name: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt?.toISOString() ?? null,
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    mcqSubmittedAt: attempt.mcqSubmittedAt?.toISOString() ?? null,
    practicalSubmittedAt: attempt.practicalSubmittedAt?.toISOString() ?? null,
    mcqScore: attempt.mcqScore,
    practicalScore: attempt.practicalScore,
    totalScore: attempt.totalScore,
    result: attempt.result,
    candidate: attempt.candidate,
    assessment: attempt.assessment,
    questionSet: attempt.questionSet,
  });
}
