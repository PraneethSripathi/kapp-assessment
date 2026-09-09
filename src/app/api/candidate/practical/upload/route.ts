import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const attemptId = formData.get("attemptId") as string;
    const file = formData.get("file") as File;

    if (!attemptId || !file) {
      return NextResponse.json({ error: "Missing attemptId or file" }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = [".xlsx", ".xls"];
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const fileExt = file.name.toLowerCase().endsWith(".xls") && !file.name.toLowerCase().endsWith(".xlsx") ? ".xls" : ".xlsx";
    const hasValidExt = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const hasValidMime = allowedMimeTypes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      return NextResponse.json({ error: "Only Excel files (.xlsx, .xls) are accepted" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate attempt exists and is in correct state
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        candidate: true,
        questionSet: true,
        assessment: { include: { practicalAssessments: true } },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (!["MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS"].includes(attempt.status)) {
      return NextResponse.json({ error: "Cannot upload at this stage" }, { status: 403 });
    }

    // Generate unique filename: attemptId-uuid.ext
    const safeFilename = `${attemptId}-${uuidv4()}${fileExt}`;

    // Read file bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadedUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Use Vercel Blob in production
      const { put } = await import("@vercel/blob");
      const blob = await put(`submissions/${safeFilename}`, buffer, {
        access: "public",
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      uploadedUrl = blob.url;
    } else {
      // Local storage for development
      const uploadsDir = path.join(process.cwd(), "uploads", "submissions");
      await mkdir(uploadsDir, { recursive: true });
      const localPath = path.join(uploadsDir, safeFilename);
      await writeFile(localPath, buffer);
      uploadedUrl = `/uploads/submissions/${safeFilename}`;
    }

    // Find the matching practical assessment for this candidate's set
    const practicalAssessment = attempt.assessment.practicalAssessments.find(
      (pa) => pa.setCode === attempt.questionSet?.code
    );

    // Upsert practical submission with full metadata
    await prisma.practicalSubmission.upsert({
      where: { attemptId },
      update: {
        uploadedFile: uploadedUrl,
        originalFilename: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        practicalAssessmentId: practicalAssessment?.id ?? null,
      },
      create: {
        attemptId,
        uploadedFile: uploadedUrl,
        originalFilename: file.name,
        fileSize: file.size,
        practicalAssessmentId: practicalAssessment?.id ?? null,
      },
    });

    // Update attempt status
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "PRACTICAL_IN_PROGRESS",
        practicalStartedAt: attempt.practicalStartedAt ?? new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      fileUrl: uploadedUrl,
      originalFilename: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
