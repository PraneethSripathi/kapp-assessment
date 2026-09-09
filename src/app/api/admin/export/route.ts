import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const attempts = await prisma.assessmentAttempt.findMany({
    include: {
      candidate: true,
      questionSet: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Name", "Email", "Mobile", "Role", "Set", "MCQ Score", "Practical Score",
    "Total Score", "Percentage", "Result", "Started", "MCQ Submitted", "Practical Submitted", "Status",
  ];

  const rows = attempts.map((a) => [
    a.candidate.name,
    a.candidate.email,
    a.candidate.mobile,
    a.candidate.role,
    a.questionSet?.code ?? "",
    a.mcqScore?.toString() ?? "",
    a.practicalScore?.toString() ?? "",
    a.totalScore?.toString() ?? "",
    a.percentage ? `${a.percentage}%` : "",
    a.result ?? "",
    a.startedAt?.toISOString() ?? "",
    a.mcqSubmittedAt?.toISOString() ?? "",
    a.practicalSubmittedAt?.toISOString() ?? "",
    a.status,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="assessment-results-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
