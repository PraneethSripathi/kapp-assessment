import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db/prisma";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const attemptId = req.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  // Look up the submission from DB — ensures candidate-file association integrity
  const submission = await prisma.practicalSubmission.findUnique({
    where: { attemptId },
    include: { attempt: { include: { candidate: true } } },
  });

  if (!submission) {
    return NextResponse.json({ error: "No submission found for this attempt" }, { status: 404 });
  }

  const fileUrl = submission.uploadedFile;
  const downloadName = submission.originalFilename || `practical-submission-${attemptId}.xlsx`;

  // If it's a Vercel Blob URL (external), redirect to it
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return NextResponse.redirect(fileUrl);
  }

  // Local file: serve from uploads/submissions/
  if (!fileUrl.startsWith("/uploads/submissions/")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
  }

  const filename = path.basename(fileUrl);
  const fullPath = path.join(process.cwd(), "uploads", "submissions", filename);

  try {
    const fileBuffer = await readFile(fullPath);
    const isXls = filename.endsWith(".xls") && !filename.endsWith(".xlsx");
    const contentType = isXls
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on server" }, { status: 404 });
  }
}
