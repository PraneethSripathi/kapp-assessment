import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { saveAnswerSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = saveAnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { attemptId, questionId, selectedOptionId } = parsed.data;

    // Verify attempt exists and is in progress
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, status: true, assignedQuestionSetId: true, expiresAt: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "MCQ_IN_PROGRESS") {
      return NextResponse.json({ error: "MCQ phase is not active" }, { status: 403 });
    }

    // Check timer
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      await prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Assessment has expired" }, { status: 410 });
    }

    // Verify question belongs to assigned set
    const question = await prisma.question.findFirst({
      where: { id: questionId, questionSetId: attempt.assignedQuestionSetId! },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not in assigned set" }, { status: 403 });
    }

    // Verify option belongs to question
    const option = await prisma.questionOption.findFirst({
      where: { id: selectedOptionId, questionId },
    });

    if (!option) {
      return NextResponse.json({ error: "Invalid option for this question" }, { status: 400 });
    }

    // Upsert the response
    await prisma.candidateResponse.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { selectedOptionId, updatedAt: new Date() },
      create: { attemptId, questionId, selectedOptionId },
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Save answer error:", error);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}
