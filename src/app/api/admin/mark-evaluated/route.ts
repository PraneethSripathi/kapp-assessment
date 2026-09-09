import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { attemptId, evaluationDone } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
    }

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        evaluationDone: evaluationDone !== false,
        evaluationDoneAt: evaluationDone !== false ? new Date() : null,
        evaluationDoneBy: evaluationDone !== false ? (session!.user?.email || session!.user?.id) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark evaluated error:", err);
    return NextResponse.json({ error: "Failed to update evaluation status" }, { status: 500 });
  }
}
