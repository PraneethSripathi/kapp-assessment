import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { questionSet: true },
  });

  if (!attempt || !attempt.questionSet) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (!["MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS", "PRACTICAL_SUBMITTED"].includes(attempt.status)) {
    return NextResponse.json({ error: "Complete MCQ first" }, { status: 403 });
  }

  const practical = await prisma.practicalAssessment.findUnique({
    where: {
      assessmentId_setCode: {
        assessmentId: attempt.assessmentId,
        setCode: attempt.questionSet.code,
      },
    },
  });

  if (!practical) {
    return NextResponse.json({ error: "Practical file not configured" }, { status: 404 });
  }

  // Update status to practical in progress
  if (attempt.status === "MCQ_SUBMITTED") {
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: "PRACTICAL_IN_PROGRESS", practicalStartedAt: new Date() },
    });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "practical-files", practical.originalFile);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${practical.originalFile}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }
}
