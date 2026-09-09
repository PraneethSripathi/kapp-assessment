"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface McqReviewItem {
  questionNumber: number;
  questionText: string;
  category: string;
  difficulty: string;
  marks: number;
  options: { label: string; text: string }[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  explanation: string | null;
}

interface CandidateDetail {
  candidate: { name: string; email: string; mobile: string; role: string };
  attempt: {
    id: string; status: string; setCode: string; setName: string;
    startedAt: string; mcqSubmittedAt: string; practicalSubmittedAt: string;
    completedAt: string; mcqScore: number | null; practicalScore: number | null;
    totalScore: number | null; percentage: number | null; result: string | null;
    adminRemarks: string | null;
  };
  assessment: { totalMcqMarks: number; totalPracticalMarks: number };
  mcqReview: McqReviewItem[];
  categoryScores: Record<string, { correct: number; total: number; marks: number; maxMarks: number }>;
  practicalSubmission: {
    uploadedFile: string; originalFilename: string | null; fileSize: number | null;
    uploadedAt: string; submittedAt: string;
    score: number | null; evaluatorNotes: string | null; evaluatedAt: string | null;
  } | null;
}

export default function CandidateDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const attemptId = params.id as string;

  const [data, setData] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [practicalScore, setPracticalScore] = useState("");
  const [evalNotes, setEvalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"mcq" | "practical" | "result">("mcq");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/admin/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch(`/api/admin/candidates/${attemptId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.practicalSubmission?.score !== null && d.practicalSubmission?.score !== undefined) {
          setPracticalScore(d.practicalSubmission.score.toString());
        }
        if (d.practicalSubmission?.evaluatorNotes) {
          setEvalNotes(d.practicalSubmission.evaluatorNotes);
        }
      })
      .finally(() => setLoading(false));
  }, [authStatus, attemptId]);

  async function handleEvaluate() {
    const score = parseFloat(practicalScore);
    if (isNaN(score) || score < 0 || score > 20) {
      alert("Enter a valid score (0-20)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, score, notes: evalNotes }),
      });

      if (res.ok) {
        // Reload data
        const d = await fetch(`/api/admin/candidates/${attemptId}`).then((r) => r.json());
        setData(d);
        setActiveTab("result");
      } else {
        const err = await res.json();
        alert(err.error || "Evaluation failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data || !session) return null;

  const { candidate, attempt, assessment, mcqReview, categoryScores, practicalSubmission } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            attempt.result === "PASS" ? "bg-green-100 text-green-700"
              : attempt.result === "FAIL" ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}>
            {attempt.result || attempt.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Candidate Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Email", value: candidate.email },
            { label: "Mobile", value: candidate.mobile },
            { label: "Role", value: candidate.role },
            { label: "Set", value: attempt.setCode || "-" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600">MCQ Score</p>
            <p className="text-xl font-bold text-blue-800">
              {attempt.mcqScore !== null ? `${attempt.mcqScore}/${assessment.totalMcqMarks}` : "-"}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-xs text-purple-600">Practical Score</p>
            <p className="text-xl font-bold text-purple-800">
              {attempt.practicalScore !== null ? `${attempt.practicalScore}/${assessment.totalPracticalMarks}` : "-"}
            </p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-xs text-indigo-600">Total Score</p>
            <p className="text-xl font-bold text-indigo-800">
              {attempt.totalScore !== null
                ? `${attempt.totalScore}/${assessment.totalMcqMarks + assessment.totalPracticalMarks}`
                : "-"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600">Percentage</p>
            <p className="text-xl font-bold text-gray-800">
              {attempt.percentage !== null ? `${attempt.percentage}%` : "-"}
            </p>
          </div>
          <div className={`rounded-lg p-4 ${
            attempt.result === "PASS" ? "bg-green-50" : attempt.result === "FAIL" ? "bg-red-50" : "bg-gray-50"
          }`}>
            <p className="text-xs text-gray-600">Result</p>
            <p className={`text-xl font-bold ${
              attempt.result === "PASS" ? "text-green-700" : attempt.result === "FAIL" ? "text-red-700" : "text-gray-500"
            }`}>
              {attempt.result || "Pending"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          {(["mcq", "practical", "result"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "mcq" ? "MCQ Review" : tab === "practical" ? "Practical" : "Final Result"}
            </button>
          ))}
        </div>

        {/* MCQ Review Tab */}
        {activeTab === "mcq" && (
          <div className="space-y-3">
            {/* Category Scores */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Category-wise Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(categoryScores).map(([cat, scores]) => (
                  <div key={cat} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700">{cat}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {scores.correct}/{scores.total}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        ({scores.marks}/{scores.maxMarks} marks)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {mcqReview.map((item) => (
              <div
                key={item.questionNumber}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                  item.isCorrect === null ? "border-gray-300"
                    : item.isCorrect ? "border-green-500"
                    : "border-red-500"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">Q{item.questionNumber}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{item.category}</span>
                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                    item.isCorrect ? "bg-green-100 text-green-700" : item.selectedAnswer ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {item.isCorrect ? "Correct" : item.selectedAnswer ? "Incorrect" : "Unanswered"}
                  </span>
                </div>
                <p className="text-sm text-gray-800 mb-3">{item.questionText}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {item.options.map((opt) => (
                    <div
                      key={opt.label}
                      className={`px-3 py-2 rounded ${
                        opt.label === item.correctAnswer
                          ? "bg-green-50 border border-green-300 text-green-800"
                          : opt.label === item.selectedAnswer && !item.isCorrect
                          ? "bg-red-50 border border-red-300 text-red-800"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="font-medium">{opt.label}.</span> {opt.text}
                      {opt.label === item.correctAnswer && <span className="ml-1 text-green-600 font-medium">(Correct)</span>}
                      {opt.label === item.selectedAnswer && opt.label !== item.correctAnswer && <span className="ml-1 text-red-600">(Selected)</span>}
                    </div>
                  ))}
                </div>
                {item.explanation && (
                  <p className="text-xs text-gray-500 mt-2 italic">{item.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Practical Tab */}
        {activeTab === "practical" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {practicalSubmission ? (
              <>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Submitted File</h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {practicalSubmission.originalFilename || "Practical submission"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {practicalSubmission.fileSize
                            ? `${(practicalSubmission.fileSize / 1024).toFixed(1)} KB`
                            : ""}
                          {practicalSubmission.submittedAt
                            ? ` · Submitted ${new Date(practicalSubmission.submittedAt).toLocaleString()}`
                            : practicalSubmission.uploadedAt
                            ? ` · Uploaded ${new Date(practicalSubmission.uploadedAt).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      <a
                        href={`/api/admin/download?attemptId=${attempt.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Evaluate Practical</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Score (0-20)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={practicalScore}
                        onChange={(e) => setPracticalScore(e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Evaluation Notes</label>
                      <textarea
                        value={evalNotes}
                        onChange={(e) => setEvalNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        placeholder="Enter evaluation notes..."
                      />
                    </div>
                    <button
                      onClick={handleEvaluate}
                      disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {saving ? "Saving..." : "Save Score & Calculate Result"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No practical submission received.</p>
            )}
          </div>
        )}

        {/* Result Tab */}
        {activeTab === "result" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div>
                <p className="text-sm text-gray-500">MCQ Score</p>
                <p className="text-lg font-bold">{attempt.mcqScore ?? "-"} / {assessment.totalMcqMarks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Practical Score</p>
                <p className="text-lg font-bold">{attempt.practicalScore ?? "-"} / {assessment.totalPracticalMarks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-lg font-bold">
                  {attempt.totalScore ?? "-"} / {assessment.totalMcqMarks + assessment.totalPracticalMarks}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Percentage</p>
                <p className="text-lg font-bold">{attempt.percentage ?? "-"}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Final Result</p>
                <p className={`text-2xl font-bold ${
                  attempt.result === "PASS" ? "text-green-600" : attempt.result === "FAIL" ? "text-red-600" : "text-gray-400"
                }`}>
                  {attempt.result || "Pending Evaluation"}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {attempt.startedAt && <p>Started: {new Date(attempt.startedAt).toLocaleString()}</p>}
                {attempt.mcqSubmittedAt && <p>MCQ Submitted: {new Date(attempt.mcqSubmittedAt).toLocaleString()}</p>}
                {attempt.practicalSubmittedAt && <p>Practical Submitted: {new Date(attempt.practicalSubmittedAt).toLocaleString()}</p>}
                {attempt.completedAt && <p>Completed: {new Date(attempt.completedAt).toLocaleString()}</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
