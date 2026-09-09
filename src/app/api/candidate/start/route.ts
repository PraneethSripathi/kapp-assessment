import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const { attemptId } = await req.json();
    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
    }

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "NOT_STARTED") {
      return NextResponse.json({
        attemptId: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt?.toISOString(),
        expiresAt: attempt.expiresAt?.toISOString(),
        assignedSetId: attempt.assignedQuestionSetId,
      });
    }

    const sets = await prisma.questionSet.findMany({
      where: { assessmentId: attempt.assessmentId },
    });

    if (sets.length === 0) {
      return NextResponse.json({ error: "No question sets available" }, { status: 500 });
    }

    const randomSet = sets[Math.floor(Math.random() * sets.length)];
    const now = new Date();
    const mcqMins = attempt.assessment.mcqDurationMins || 30;
    const expiresAt = new Date(now.getTime() + mcqMins * 60 * 1000);

    const updated = await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "MCQ_IN_PROGRESS",
        assignedQuestionSetId: randomSet.id,
        startedAt: now,
        expiresAt,
      },
    });

    const questions = await prisma.question.findMany({
      where: { questionSetId: randomSet.id },
      orderBy: { orderIndex: "asc" },
    });

    await prisma.candidateResponse.createMany({
      data: questions.map((q) => ({
        attemptId,
        questionId: q.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      attemptId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt?.toISOString(),
      expiresAt: updated.expiresAt?.toISOString(),
      assignedSetId: randomSet.id,
      assignedSetCode: randomSet.code,
    });
  } catch (error) {
    console.error("Start assessment error:", error);
    return NextResponse.json({ error: "Failed to start assessment" }, { status: 500 });
  }
}
