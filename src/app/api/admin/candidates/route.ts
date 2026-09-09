import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const setCode = req.nextUrl.searchParams.get("setCode") || "";

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(setCode ? { questionSet: { code: setCode } } : {}),
      ...(search
        ? {
            candidate: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      candidate: true,
      questionSet: { select: { code: true, name: true } },
      responses: { select: { isCorrect: true, selectedOptionId: true } },
      practicalSubmission: {
        select: {
          uploadedFile: true, originalFilename: true, fileSize: true,
          submittedAt: true, score: true, questionScores: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const candidates = attempts.map((a) => {
    const totalMcq = a.responses.length;
    const mcqCorrect = a.responses.filter((r) => r.isCorrect === true).length;
    const mcqIncorrect = a.responses.filter((r) => r.isCorrect === false && r.selectedOptionId !== null).length;
    const mcqUntouched = totalMcq - mcqCorrect - mcqIncorrect;

    let practicalCorrect = 0;
    let practicalIncorrect = 0;
    let practicalUntouched = 5;
    const qs = a.practicalSubmission?.questionScores;
    if (qs && Array.isArray(qs)) {
      practicalCorrect = (qs as Array<{ status: string }>).filter((q) => q.status === "correct").length;
      practicalIncorrect = (qs as Array<{ status: string }>).filter((q) => q.status === "incorrect").length;
      practicalUntouched = (qs as Array<{ status: string }>).filter((q) => q.status === "untouched").length;
    }

    return {
      id: a.candidate.id,
      name: a.candidate.name,
      email: a.candidate.email,
      mobile: a.candidate.mobile,
      role: a.candidate.role,
      attemptId: a.id,
      status: a.status,
      setCode: a.questionSet?.code ?? null,
      startedAt: a.startedAt?.toISOString() ?? null,
      mcqSubmittedAt: a.mcqSubmittedAt?.toISOString() ?? null,
      practicalSubmittedAt: a.practicalSubmittedAt?.toISOString() ?? null,
      mcqScore: a.mcqScore,
      mcqCorrect,
      mcqIncorrect,
      mcqUntouched,
      practicalScore: a.practicalScore,
      practicalCorrect,
      practicalIncorrect,
      practicalUntouched,
      totalScore: a.totalScore,
      percentage: a.percentage,
      result: a.result,
      evaluationDone: a.evaluationDone,
      practicalFile: a.practicalSubmission?.uploadedFile ?? null,
      practicalFilename: a.practicalSubmission?.originalFilename ?? null,
      practicalFileSize: a.practicalSubmission?.fileSize ?? null,
    };
  });

  return NextResponse.json({ candidates });
}
