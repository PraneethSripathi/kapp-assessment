"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  total: number;
  active: number;
  completed: number;
  passed: number;
  failed: number;
  pendingEval: number;
  evaluationDone: number;
}

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  attemptId: string;
  status: string;
  setCode: string | null;
  startedAt: string | null;
  mcqSubmittedAt: string | null;
  practicalSubmittedAt: string | null;
  mcqScore: number | null;
  mcqCorrect: number;
  mcqIncorrect: number;
  mcqUntouched: number;
  practicalScore: number | null;
  practicalCorrect: number;
  practicalIncorrect: number;
  practicalUntouched: number;
  totalScore: number | null;
  percentage: number | null;
  result: string | null;
  evaluationDone: boolean;
  practicalFile: string | null;
  practicalFilename: string | null;
  practicalFileSize: number | null;
}

function getRowHighlight(c: CandidateRow): string {
  if (c.result === "PASS") return "bg-green-50/60 hover:bg-green-50";
  if (c.result === "FAIL") return "bg-yellow-50/60 hover:bg-yellow-50";
  return "hover:bg-gray-50";
}

export default function AdminDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch(`/api/admin/candidates?search=${search}&status=${statusFilter}`).then((r) => r.json()),
    ]).then(([statsData, candidatesData]) => {
      setStats(statsData);
      setCandidates(candidatesData.candidates || []);
      setLoading(false);
    });
  }, [authStatus, search, statusFilter]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/config" className="text-sm text-blue-600 hover:underline">
              Settings
            </Link>
            <a
              href="/api/admin/export"
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
            >
              Export CSV
            </a>
            <span className="text-sm text-gray-500">{session.user?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Active", value: stats.active, color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Completed", value: stats.completed, color: "bg-green-50 text-green-700 border-green-200" },
              { label: "Passed", value: stats.passed, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Failed", value: stats.failed, color: "bg-red-50 text-red-700 border-red-200" },
              { label: "Pending Eval", value: stats.pendingEval, color: "bg-purple-50 text-purple-700 border-purple-200" },
              { label: "Eval Done", value: stats.evaluationDone, color: "bg-teal-50 text-teal-700 border-teal-200" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-lg p-3 border`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-64 text-gray-900"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
          >
            <option value="">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="MCQ_IN_PROGRESS">MCQ In Progress</option>
            <option value="MCQ_SUBMITTED">MCQ Submitted</option>
            <option value="PRACTICAL_IN_PROGRESS">Practical In Progress</option>
            <option value="EVALUATION_PENDING">Evaluation Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600" title="MCQ Correct/Incorrect/Untouched">MCQ (C/I/U)</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">MCQ Score</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600" title="Practical Correct/Incorrect/Untouched">Prac (C/I/U)</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">Prac Score</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">Total</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">%</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">Result</th>
                <th className="text-center px-2 py-3 font-medium text-gray-600">Eval Status</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">File</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.attemptId} className={`border-b ${getRowHighlight(c)}`}>
                  <td className="px-3 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{c.email}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === "COMPLETED" ? "bg-green-100 text-green-700"
                        : c.status === "EVALUATION_PENDING" ? "bg-purple-100 text-purple-700"
                        : c.status === "EXPIRED" ? "bg-red-100 text-red-700"
                        : c.status.includes("IN_PROGRESS") ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center text-xs">
                    {c.mcqScore !== null ? (
                      <span>
                        <span className="text-green-600 font-medium">{c.mcqCorrect}</span>
                        /
                        <span className="text-red-600 font-medium">{c.mcqIncorrect}</span>
                        /
                        <span className="text-gray-400">{c.mcqUntouched}</span>
                      </span>
                    ) : "-"}
                  </td>
                  <td className={`px-2 py-3 text-center font-medium ${
                    c.mcqScore !== null && c.mcqScore >= 12 ? "text-green-700" : c.mcqScore !== null ? "text-red-600" : ""
                  }`}>
                    {c.mcqScore !== null ? `${c.mcqScore}/20` : "-"}
                  </td>
                  <td className="px-2 py-3 text-center text-xs">
                    {c.practicalScore !== null ? (
                      <span>
                        <span className="text-green-600 font-medium">{c.practicalCorrect}</span>
                        /
                        <span className="text-red-600 font-medium">{c.practicalIncorrect}</span>
                        /
                        <span className="text-gray-400">{c.practicalUntouched}</span>
                      </span>
                    ) : "-"}
                  </td>
                  <td className={`px-2 py-3 text-center font-medium ${
                    c.practicalScore !== null && c.practicalScore >= 12 ? "text-green-700" : c.practicalScore !== null ? "text-red-600" : ""
                  }`}>
                    {c.practicalScore !== null ? `${c.practicalScore}/20` : "-"}
                  </td>
                  <td className="px-2 py-3 text-center font-semibold">
                    {c.totalScore !== null ? `${c.totalScore}/40` : "-"}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {c.percentage !== null ? `${c.percentage}%` : "-"}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {c.result ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        c.result === "PASS" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {c.result === "PASS" ? "PASSED" : "FAILED"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {c.evaluationDone ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">Done</span>
                    ) : c.status === "EVALUATION_PENDING" || c.status === "COMPLETED" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Pending</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {c.practicalFile ? (
                      <a
                        href={`/api/admin/download?attemptId=${c.attemptId}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition"
                        title={c.practicalFilename || "Download"}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        DL
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Link
                      href={`/admin/candidates/${c.attemptId}`}
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-50 border border-green-300" />
            Passed (both sections &ge; 60%)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-300" />
            Failed (either section &lt; 60%)
          </div>
        </div>
      </main>
    </div>
  );
}
