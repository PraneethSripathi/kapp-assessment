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
      include: { practicalSubmission: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED"].includes(attempt.status)) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    if (attempt.status !== "PRACTICAL_IN_PROGRESS") {
      return NextResponse.json({ error: "Cannot submit practical at this stage" }, { status: 403 });
    }

    const now = new Date();

    if (attempt.practicalSubmission) {
      await prisma.practicalSubmission.update({
        where: { attemptId },
        data: { submittedAt: now },
      });
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "EVALUATION_PENDING",
        practicalSubmittedAt: now,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit practical error:", error);
    return NextResponse.json({ error: "Failed to submit practical" }, { status: 500 });
  }
}
