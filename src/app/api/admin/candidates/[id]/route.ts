import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: attemptId } = await params;

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate: true,
      assessment: true,
      questionSet: true,
      responses: {
        include: {
          question: {
            include: {
              options: { orderBy: { label: "asc" } },
              answerKey: { include: { correctOption: true } },
            },
          },
          selectedOption: true,
        },
        orderBy: { question: { orderIndex: "asc" } },
      },
      practicalSubmission: true,
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const mcqReview = attempt.responses.map((r) => ({
    questionNumber: r.question.orderIndex,
    questionText: r.question.questionText,
    category: r.question.category,
    difficulty: r.question.difficulty,
    marks: r.question.marks,
    options: r.question.options.map((o) => ({
      label: o.label,
      text: o.optionText,
    })),
    selectedAnswer: r.selectedOption?.label ?? null,
    correctAnswer: r.question.answerKey?.correctOption.label ?? null,
    isCorrect: r.isCorrect,
    marksAwarded: r.marksAwarded,
    explanation: r.question.answerKey?.explanation ?? null,
  }));

  // Category scores
  const categoryScores: Record<string, { correct: number; total: number; marks: number; maxMarks: number }> = {};
  for (const r of attempt.responses) {
    const cat = r.question.category;
    if (!categoryScores[cat]) categoryScores[cat] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
    categoryScores[cat].total++;
    categoryScores[cat].maxMarks += r.question.marks;
    if (r.isCorrect) {
      categoryScores[cat].correct++;
      categoryScores[cat].marks += r.marksAwarded ?? 0;
    }
  }

  const mcqCorrect = attempt.responses.filter((r) => r.isCorrect === true).length;
  const mcqIncorrect = attempt.responses.filter((r) => r.isCorrect === false && r.selectedOptionId !== null).length;
  const mcqUntouched = attempt.responses.length - mcqCorrect - mcqIncorrect;

  return NextResponse.json({
    mcqBreakdown: { correct: mcqCorrect, incorrect: mcqIncorrect, untouched: mcqUntouched, total: attempt.responses.length },
    candidate: {
      name: attempt.candidate.name,
      email: attempt.candidate.email,
      mobile: attempt.candidate.mobile,
      role: attempt.candidate.role,
    },
    attempt: {
      id: attempt.id,
      status: attempt.status,
      setCode: attempt.questionSet?.code,
      setName: attempt.questionSet?.name,
      startedAt: attempt.startedAt?.toISOString(),
      mcqSubmittedAt: attempt.mcqSubmittedAt?.toISOString(),
      practicalSubmittedAt: attempt.practicalSubmittedAt?.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
      mcqScore: attempt.mcqScore,
      practicalScore: attempt.practicalScore,
      totalScore: attempt.totalScore,
      percentage: attempt.percentage,
      result: attempt.result,
      adminRemarks: attempt.adminRemarks,
      evaluationDone: attempt.evaluationDone,
      evaluationDoneAt: attempt.evaluationDoneAt?.toISOString(),
      evaluationDoneBy: attempt.evaluationDoneBy,
    },
    assessment: {
      totalMcqMarks: attempt.assessment.totalMcqMarks,
      totalPracticalMarks: attempt.assessment.totalPracticalMarks,
    },
    mcqReview,
    categoryScores,
    practicalSubmission: attempt.practicalSubmission
      ? {
          uploadedFile: attempt.practicalSubmission.uploadedFile,
          originalFilename: attempt.practicalSubmission.originalFilename,
          fileSize: attempt.practicalSubmission.fileSize,
          uploadedAt: attempt.practicalSubmission.uploadedAt?.toISOString(),
          submittedAt: attempt.practicalSubmission.submittedAt?.toISOString(),
          score: attempt.practicalSubmission.score,
          questionScores: attempt.practicalSubmission.questionScores,
          evaluatorNotes: attempt.practicalSubmission.evaluatorNotes,
          evaluatedAt: attempt.practicalSubmission.evaluatedAt?.toISOString(),
        }
      : null,
  });
}
