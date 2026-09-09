import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { candidateRegistrationSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = candidateRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, mobile, role } = parsed.data;

    const assessment = await prisma.assessment.findFirst({ where: { active: true } });
    if (!assessment) {
      return NextResponse.json({ error: "No active assessment found" }, { status: 404 });
    }

    // Check for existing incomplete attempt
    const existingAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        candidate: { email },
        assessmentId: assessment.id,
        status: { notIn: ["COMPLETED", "EXPIRED"] },
      },
      include: { candidate: true },
    });

    if (existingAttempt) {
      return NextResponse.json({
        candidateId: existingAttempt.candidateId,
        attemptId: existingAttempt.id,
        message: "Existing attempt found",
      });
    }

    // Check if already completed
    const completedAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        candidate: { email },
        assessmentId: assessment.id,
        status: { in: ["COMPLETED", "EXPIRED"] },
      },
    });

    if (completedAttempt) {
      return NextResponse.json(
        { error: "You have already completed this assessment." },
        { status: 409 }
      );
    }

    // Create candidate and attempt
    const candidate = await prisma.candidate.create({
      data: { name, email, mobile, role },
    });

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        candidateId: candidate.id,
        assessmentId: assessment.id,
        status: "NOT_STARTED",
      },
    });

    return NextResponse.json({
      candidateId: candidate.id,
      attemptId: attempt.id,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
