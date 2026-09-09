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
      practicalSubmission: { select: { uploadedFile: true, submittedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const candidates = attempts.map((a) => ({
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
    practicalScore: a.practicalScore,
    totalScore: a.totalScore,
    percentage: a.percentage,
    result: a.result,
    practicalFile: a.practicalSubmission?.uploadedFile ?? null,
  }));

  return NextResponse.json({ candidates });
}
