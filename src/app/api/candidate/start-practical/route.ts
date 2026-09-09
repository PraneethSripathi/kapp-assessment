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

    // If already in practical, return existing timer
    if (attempt.status === "PRACTICAL_IN_PROGRESS") {
      return NextResponse.json({
        success: true,
        alreadyStarted: true,
        practicalStartedAt: attempt.practicalStartedAt?.toISOString(),
        practicalExpiresAt: attempt.practicalExpiresAt?.toISOString(),
      });
    }

    if (attempt.status !== "MCQ_SUBMITTED") {
      return NextResponse.json({ error: "Cannot start practical at this stage" }, { status: 403 });
    }

    const now = new Date();
    const practicalMins = attempt.assessment.practicalDurationMins || 15;
    const practicalExpiresAt = new Date(now.getTime() + practicalMins * 60 * 1000);

    const updated = await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "PRACTICAL_IN_PROGRESS",
        practicalStartedAt: now,
        practicalExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      practicalStartedAt: updated.practicalStartedAt?.toISOString(),
      practicalExpiresAt: updated.practicalExpiresAt?.toISOString(),
    });
  } catch (error) {
    console.error("Start practical error:", error);
    return NextResponse.json({ error: "Failed to start practical" }, { status: 500 });
  }
}
