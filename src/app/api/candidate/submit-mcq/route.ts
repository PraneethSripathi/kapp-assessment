import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { evaluateMcqAttempt } from "@/lib/scoring/mcq";

export async function POST(req: NextRequest) {
  try {
    const { attemptId } = await req.json();
    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
    }

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (["MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS", "PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED"].includes(attempt.status)) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    if (attempt.status !== "MCQ_IN_PROGRESS" && attempt.status !== "EXPIRED") {
      return NextResponse.json({ error: "Cannot submit MCQ at this stage" }, { status: 403 });
    }

    const result = await evaluateMcqAttempt(attemptId);

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "MCQ_SUBMITTED",
        mcqSubmittedAt: new Date(),
        mcqScore: result.totalScore,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit MCQ error:", error);
    return NextResponse.json({ error: "Failed to submit MCQ" }, { status: 500 });
  }
}
