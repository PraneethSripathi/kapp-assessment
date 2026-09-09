import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      assignedQuestionSetId: true,
      expiresAt: true,
    },
  });

  if (!attempt || !attempt.assignedQuestionSetId) {
    return NextResponse.json({ error: "Attempt not found or not started" }, { status: 404 });
  }

  // Check if expired
  if (attempt.expiresAt && new Date() > attempt.expiresAt) {
    if (attempt.status === "MCQ_IN_PROGRESS") {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: "Assessment has expired" }, { status: 410 });
  }

  // Only serve questions during MCQ phase
  if (!["MCQ_IN_PROGRESS", "MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS", "PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED"].includes(attempt.status)) {
    return NextResponse.json({ error: "Assessment not in progress" }, { status: 403 });
  }

  const questions = await prisma.question.findMany({
    where: { questionSetId: attempt.assignedQuestionSetId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      questionText: true,
      category: true,
      difficulty: true,
      orderIndex: true,
      marks: true,
      options: {
        select: { id: true, label: true, optionText: true },
        orderBy: { label: "asc" },
      },
    },
  });

  // Get existing responses
  const responses = await prisma.candidateResponse.findMany({
    where: { attemptId },
    select: { questionId: true, selectedOptionId: true },
  });

  const responseMap = new Map(responses.map((r) => [r.questionId, r.selectedOptionId]));

  return NextResponse.json({
    questions: questions.map((q) => ({
      ...q,
      selectedOptionId: responseMap.get(q.id) ?? null,
    })),
  });
}
