import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [total, active, completed, passed, failed, pendingEval, evaluationDone] = await Promise.all([
    prisma.assessmentAttempt.count(),
    prisma.assessmentAttempt.count({
      where: { status: { in: ["MCQ_IN_PROGRESS", "MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS"] } },
    }),
    prisma.assessmentAttempt.count({
      where: { status: { in: ["EVALUATION_PENDING", "COMPLETED"] } },
    }),
    prisma.assessmentAttempt.count({ where: { result: "PASS" } }),
    prisma.assessmentAttempt.count({ where: { result: "FAIL" } }),
    prisma.assessmentAttempt.count({
      where: {
        status: { in: ["EVALUATION_PENDING", "COMPLETED"] },
        evaluationDone: false,
      },
    }),
    prisma.assessmentAttempt.count({ where: { evaluationDone: true } }),
  ]);

  return NextResponse.json({ total, active, completed, passed, failed, pendingEval, evaluationDone });
}
