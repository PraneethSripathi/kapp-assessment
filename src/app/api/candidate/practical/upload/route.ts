import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { put } from "@vercel/blob";
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
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "Only Excel files (.xlsx, .xls) are accepted" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (!["MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS"].includes(attempt.status)) {
      return NextResponse.json({ error: "Cannot upload at this stage" }, { status: 403 });
    }

    const ext = file.name.endsWith(".xls") ? ".xls" : ".xlsx";
    const safeFilename = `${attemptId}-${uuidv4()}${ext}`;

    let uploadedUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Use Vercel Blob in production
      const blob = await put(`submissions/${safeFilename}`, file, { access: "public" });
      uploadedUrl = blob.url;
    } else {
      // Local storage for development
      const uploadsDir = path.join(process.cwd(), "uploads", "submissions");
      await mkdir(uploadsDir, { recursive: true });
      const localPath = path.join(uploadsDir, safeFilename);
      const bytes = await file.arrayBuffer();
      await writeFile(localPath, Buffer.from(bytes));
      uploadedUrl = `/uploads/submissions/${safeFilename}`;
    }

    // Upsert practical submission
    await prisma.practicalSubmission.upsert({
      where: { attemptId },
      update: { uploadedFile: uploadedUrl, uploadedAt: new Date() },
      create: { attemptId, uploadedFile: uploadedUrl },
    });

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: "PRACTICAL_IN_PROGRESS" },
    });

    return NextResponse.json({ success: true, fileUrl: uploadedUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
