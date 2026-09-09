import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Only allow files from uploads/submissions/
  if (!filePath.startsWith("/uploads/submissions/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  // Prevent path traversal
  const filename = path.basename(filePath);
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
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
