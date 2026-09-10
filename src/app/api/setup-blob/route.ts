import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("key");
  if (secret !== "kapp-setup-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const practicals = await prisma.practicalAssessment.findMany();
  const results = [];

  for (const p of practicals) {
    try {
      const filePath = path.join(process.cwd(), "public", "practical-files", p.originalFile);
      const buffer = await readFile(filePath);
      const blob = await put(`practical-files/${p.originalFile}`, buffer, {
        access: "public",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      await prisma.practicalAssessment.update({
        where: { id: p.id },
        data: { downloadUrl: blob.url },
      });

      results.push({ set: p.setCode, file: p.originalFile, url: blob.url });
    } catch (err) {
      results.push({ set: p.setCode, file: p.originalFile, error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
