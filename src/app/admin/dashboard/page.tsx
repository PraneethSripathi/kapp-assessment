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
  practicalScore: number | null;
  totalScore: number | null;
  percentage: number | null;
  result: string | null;
  practicalFile: string | null;
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700" },
              { label: "Active", value: stats.active, color: "bg-yellow-50 text-yellow-700" },
              { label: "Completed", value: stats.completed, color: "bg-green-50 text-green-700" },
              { label: "Passed", value: stats.passed, color: "bg-emerald-50 text-emerald-700" },
              { label: "Failed", value: stats.failed, color: "bg-red-50 text-red-700" },
              { label: "Pending Eval", value: stats.pendingEval, color: "bg-purple-50 text-purple-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-lg p-4`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm opacity-80">{s.label}</p>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Set</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">MCQ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Practical</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Result</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Practical File</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.attemptId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3">{c.setCode || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.status === "COMPLETED" ? "bg-green-100 text-green-700"
                        : c.status === "EVALUATION_PENDING" ? "bg-purple-100 text-purple-700"
                        : c.status === "EXPIRED" ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.mcqScore !== null ? `${c.mcqScore}/20` : "-"}</td>
                  <td className="px-4 py-3">{c.practicalScore !== null ? `${c.practicalScore}/20` : "-"}</td>
                  <td className="px-4 py-3">{c.totalScore !== null ? `${c.totalScore}/40` : "-"}</td>
                  <td className="px-4 py-3">
                    {c.result && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        c.result === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {c.result}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.practicalFile ? (
                      <a
                        href={c.practicalFile.startsWith("/uploads/")
                          ? `/api/admin/download?path=${encodeURIComponent(c.practicalFile)}`
                          : c.practicalFile
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/candidates/${c.attemptId}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
