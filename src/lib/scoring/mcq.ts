import { prisma } from "@/lib/db/prisma";

export async function evaluateMcqAttempt(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: { include: { question: true } },
      questionSet: { include: { questions: { include: { answerKey: true } } } },
    },
  });

  if (!attempt || !attempt.questionSet) {
    throw new Error("Attempt or question set not found");
  }

  const answerKeyMap = new Map<string, string>();
  for (const q of attempt.questionSet.questions) {
    if (q.answerKey) {
      answerKeyMap.set(q.id, q.answerKey.correctOptionId);
    }
  }

  let totalScore = 0;
  const categoryScores: Record<string, { correct: number; total: number; marks: number; maxMarks: number }> = {};

  for (const response of attempt.responses) {
    const correctOptionId = answerKeyMap.get(response.questionId);
    const isCorrect = correctOptionId ? response.selectedOptionId === correctOptionId : false;
    const marksAwarded = isCorrect ? response.question.marks : 0;

    await prisma.candidateResponse.update({
      where: { id: response.id },
      data: { isCorrect, marksAwarded },
    });

    totalScore += marksAwarded;

    const cat = response.question.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
    }
    categoryScores[cat].total++;
    categoryScores[cat].maxMarks += response.question.marks;
    if (isCorrect) {
      categoryScores[cat].correct++;
      categoryScores[cat].marks += marksAwarded;
    }
  }

  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: { mcqScore: totalScore },
  });

  return { totalScore, categoryScores };
}

export async function calculateFinalResult(attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true },
  });

  if (!attempt || !attempt.assessment) return null;

  const mcqScore = attempt.mcqScore ?? 0;
  const practicalScore = attempt.practicalScore ?? 0;
  const totalScore = mcqScore + practicalScore;
  const maxTotal = attempt.assessment.totalMcqMarks + attempt.assessment.totalPracticalMarks;
  const percentage = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;

  const mcqPass = mcqScore >= (attempt.assessment.totalMcqMarks * 0.6);
  const practicalPass = practicalScore >= (attempt.assessment.totalPracticalMarks * 0.6);
  const result = mcqPass && practicalPass ? "PASS" : "FAIL";

  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      totalScore,
      percentage: Math.round(percentage * 100) / 100,
      result,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return { mcqScore, practicalScore, totalScore, percentage, result };
}
