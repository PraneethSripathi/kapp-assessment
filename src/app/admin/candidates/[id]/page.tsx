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

interface QuestionScore {
  question: number;
  status: "correct" | "incorrect" | "untouched";
  marks: number;
}

interface CandidateDetail {
  mcqBreakdown: { correct: number; incorrect: number; untouched: number; total: number };
  candidate: { name: string; email: string; mobile: string; role: string };
  attempt: {
    id: string; status: string; setCode: string; setName: string;
    startedAt: string; mcqSubmittedAt: string; practicalSubmittedAt: string;
    completedAt: string; mcqScore: number | null; practicalScore: number | null;
    totalScore: number | null; percentage: number | null; result: string | null;
    adminRemarks: string | null;
    evaluationDone: boolean; evaluationDoneAt: string | null; evaluationDoneBy: string | null;
  };
  assessment: { totalMcqMarks: number; totalPracticalMarks: number };
  mcqReview: McqReviewItem[];
  categoryScores: Record<string, { correct: number; total: number; marks: number; maxMarks: number }>;
  practicalSubmission: {
    uploadedFile: string; originalFilename: string | null; fileSize: number | null;
    uploadedAt: string; submittedAt: string;
    score: number | null; questionScores: QuestionScore[] | null;
    evaluatorNotes: string | null; evaluatedAt: string | null;
  } | null;
}

const defaultQuestionScores: QuestionScore[] = [
  { question: 1, status: "untouched", marks: 0 },
  { question: 2, status: "untouched", marks: 0 },
  { question: 3, status: "untouched", marks: 0 },
  { question: 4, status: "untouched", marks: 0 },
  { question: 5, status: "untouched", marks: 0 },
];

export default function CandidateDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const attemptId = params.id as string;

  const [data, setData] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qScores, setQScores] = useState<QuestionScore[]>(defaultQuestionScores);
  const [evalNotes, setEvalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
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
        if (d.practicalSubmission?.questionScores && Array.isArray(d.practicalSubmission.questionScores)) {
          setQScores(d.practicalSubmission.questionScores);
        }
        if (d.practicalSubmission?.evaluatorNotes) {
          setEvalNotes(d.practicalSubmission.evaluatorNotes);
        }
      })
      .finally(() => setLoading(false));
  }, [authStatus, attemptId]);

  function updateQuestionScore(idx: number, status: "correct" | "incorrect" | "untouched") {
    setQScores((prev) =>
      prev.map((q, i) =>
        i === idx ? { ...q, status, marks: status === "correct" ? 4 : 0 } : q
      )
    );
  }

  function updateQuestionMarks(idx: number, marks: number) {
    setQScores((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, marks: Math.min(4, Math.max(0, marks)) } : q))
    );
  }

  async function handleEvaluate(markDone = false) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionScores: qScores,
          notes: evalNotes,
          markEvaluationDone: markDone,
        }),
      });

      if (res.ok) {
        const d = await fetch(`/api/admin/candidates/${attemptId}`).then((r) => r.json());
        setData(d);
        if (d.practicalSubmission?.questionScores) setQScores(d.practicalSubmission.questionScores);
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

  async function handleToggleEvaluationDone() {
    if (!data) return;
    setMarkingDone(true);
    try {
      const newVal = !data.attempt.evaluationDone;
      const res = await fetch("/api/admin/mark-evaluated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, evaluationDone: newVal }),
      });
      if (res.ok) {
        const d = await fetch(`/api/admin/candidates/${attemptId}`).then((r) => r.json());
        setData(d);
      }
    } catch {
      alert("Network error");
    } finally {
      setMarkingDone(false);
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

  const { candidate, attempt, assessment, mcqReview, categoryScores, practicalSubmission, mcqBreakdown } = data;
  const mcqPassThreshold = assessment.totalMcqMarks * 0.6;
  const pracPassThreshold = assessment.totalPracticalMarks * 0.6;
  const mcqPassed = attempt.mcqScore !== null && attempt.mcqScore >= mcqPassThreshold;
  const pracPassed = attempt.practicalScore !== null && attempt.practicalScore >= pracPassThreshold;
  const practicalTotal = qScores.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {attempt.evaluationDone ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-700">Evaluation Done</span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">Pending Evaluation</span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              attempt.result === "PASS" ? "bg-green-100 text-green-700"
                : attempt.result === "FAIL" ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-700"
            }`}>
              {attempt.result || attempt.status.replace(/_/g, " ")}
            </span>
          </div>
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

        {/* Score Summary with section pass indicators */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className={`rounded-lg p-3 border ${mcqPassed ? "bg-green-50 border-green-200" : attempt.mcqScore !== null ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}>
            <p className="text-xs text-gray-600">MCQ Score</p>
            <p className="text-xl font-bold">{attempt.mcqScore !== null ? `${attempt.mcqScore}/${assessment.totalMcqMarks}` : "-"}</p>
            {attempt.mcqScore !== null && (
              <p className={`text-xs font-medium ${mcqPassed ? "text-green-600" : "text-red-600"}`}>
                {mcqPassed ? ">=60%" : "<60%"}
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600">MCQ Breakdown</p>
            <p className="text-sm font-medium mt-1">
              <span className="text-green-600">{mcqBreakdown.correct}C</span>{" / "}
              <span className="text-red-600">{mcqBreakdown.incorrect}I</span>{" / "}
              <span className="text-gray-500">{mcqBreakdown.untouched}U</span>
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${pracPassed ? "bg-green-50 border-green-200" : attempt.practicalScore !== null ? "bg-yellow-50 border-yellow-200" : "bg-purple-50 border-purple-200"}`}>
            <p className="text-xs text-gray-600">Practical Score</p>
            <p className="text-xl font-bold">{attempt.practicalScore !== null ? `${attempt.practicalScore}/${assessment.totalPracticalMarks}` : "-"}</p>
            {attempt.practicalScore !== null && (
              <p className={`text-xs font-medium ${pracPassed ? "text-green-600" : "text-red-600"}`}>
                {pracPassed ? ">=60%" : "<60%"}
              </p>
            )}
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <p className="text-xs text-indigo-600">Total Score</p>
            <p className="text-xl font-bold text-indigo-800">
              {attempt.totalScore !== null ? `${attempt.totalScore}/${assessment.totalMcqMarks + assessment.totalPracticalMarks}` : "-"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600">Overall %</p>
            <p className="text-xl font-bold text-gray-800">{attempt.percentage !== null ? `${attempt.percentage}%` : "-"}</p>
          </div>
          <div className={`rounded-lg p-3 border ${
            attempt.result === "PASS" ? "bg-green-50 border-green-200" : attempt.result === "FAIL" ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"
          }`}>
            <p className="text-xs text-gray-600">Result</p>
            <p className={`text-xl font-bold ${
              attempt.result === "PASS" ? "text-green-700" : attempt.result === "FAIL" ? "text-yellow-800" : "text-gray-500"
            }`}>
              {attempt.result === "PASS" ? "PASSED" : attempt.result === "FAIL" ? "FAILED" : "Pending"}
            </p>
          </div>
        </div>

        {/* Evaluation Done toggle */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Evaluation Status</p>
            <p className="text-sm text-gray-500">
              {attempt.evaluationDone
                ? `Marked as done${attempt.evaluationDoneBy ? ` by ${attempt.evaluationDoneBy}` : ""}${attempt.evaluationDoneAt ? ` on ${new Date(attempt.evaluationDoneAt).toLocaleString()}` : ""}`
                : "Pending — mark as done after reviewing all sections"}
            </p>
          </div>
          <button
            onClick={handleToggleEvaluationDone}
            disabled={markingDone}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              attempt.evaluationDone
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-teal-600 text-white hover:bg-teal-700"
            } disabled:opacity-50`}
          >
            {markingDone ? "Saving..." : attempt.evaluationDone ? "Reopen Evaluation" : "Mark Evaluation Done"}
          </button>
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
              {tab === "mcq" ? "MCQ Review" : tab === "practical" ? "Practical Evaluation" : "Final Result"}
            </button>
          ))}
        </div>

        {/* MCQ Review Tab */}
        {activeTab === "mcq" && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">MCQ Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{mcqBreakdown.correct}</p>
                  <p className="text-xs text-green-600">Correct</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{mcqBreakdown.incorrect}</p>
                  <p className="text-xs text-red-600">Incorrect</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{mcqBreakdown.untouched}</p>
                  <p className="text-xs text-gray-500">Untouched</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{attempt.mcqScore ?? 0}/20</p>
                  <p className="text-xs text-blue-600">Score</p>
                </div>
              </div>

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

        {/* Practical Evaluation Tab */}
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
                          {practicalSubmission.fileSize ? `${(practicalSubmission.fileSize / 1024).toFixed(1)} KB` : ""}
                          {practicalSubmission.submittedAt ? ` · Submitted ${new Date(practicalSubmission.submittedAt).toLocaleString()}` : ""}
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
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Per-Question Evaluation (5 Questions x 4 Marks)</h3>

                  <div className="space-y-3 mb-6">
                    {qScores.map((q, idx) => (
                      <div key={idx} className={`rounded-lg p-4 border ${
                        q.status === "correct" ? "bg-green-50 border-green-200"
                          : q.status === "incorrect" ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">Question {q.question}</span>
                          <div className="flex items-center gap-2">
                            {(["correct", "incorrect", "untouched"] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateQuestionScore(idx, s)}
                                className={`px-3 py-1 text-xs rounded-full font-medium transition ${
                                  q.status === s
                                    ? s === "correct" ? "bg-green-600 text-white"
                                      : s === "incorrect" ? "bg-red-600 text-white"
                                      : "bg-gray-600 text-white"
                                    : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                            <div className="ml-3 flex items-center gap-1">
                              <label className="text-xs text-gray-500">Marks:</label>
                              <input
                                type="number"
                                min="0"
                                max="4"
                                step="1"
                                value={q.marks}
                                onChange={(e) => updateQuestionMarks(idx, parseFloat(e.target.value) || 0)}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center text-gray-900"
                              />
                              <span className="text-xs text-gray-400">/4</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-blue-800">
                      Practical Total: <strong>{practicalTotal}/20</strong>
                      <span className="ml-2 text-xs">
                        ({qScores.filter((q) => q.status === "correct").length} Correct,{" "}
                        {qScores.filter((q) => q.status === "incorrect").length} Incorrect,{" "}
                        {qScores.filter((q) => q.status === "untouched").length} Untouched)
                      </span>
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-1">Evaluation Notes</label>
                    <textarea
                      value={evalNotes}
                      onChange={(e) => setEvalNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Enter evaluation notes..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEvaluate(false)}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? "Saving..." : "Save Score & Calculate Result"}
                    </button>
                    <button
                      onClick={() => handleEvaluate(true)}
                      disabled={saving}
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition"
                    >
                      {saving ? "Saving..." : "Save & Mark Evaluation Done"}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mb-6">
              <div>
                <p className="text-sm text-gray-500">MCQ Score</p>
                <p className={`text-lg font-bold ${mcqPassed ? "text-green-700" : attempt.mcqScore !== null ? "text-red-600" : ""}`}>
                  {attempt.mcqScore ?? "-"} / {assessment.totalMcqMarks}
                </p>
                {attempt.mcqScore !== null && (
                  <p className="text-xs text-gray-500">
                    {mcqBreakdown.correct}C / {mcqBreakdown.incorrect}I / {mcqBreakdown.untouched}U
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Practical Score</p>
                <p className={`text-lg font-bold ${pracPassed ? "text-green-700" : attempt.practicalScore !== null ? "text-red-600" : ""}`}>
                  {attempt.practicalScore ?? "-"} / {assessment.totalPracticalMarks}
                </p>
                {practicalSubmission?.questionScores && Array.isArray(practicalSubmission.questionScores) && (
                  <p className="text-xs text-gray-500">
                    {(practicalSubmission.questionScores as QuestionScore[]).filter((q) => q.status === "correct").length}C /
                    {(practicalSubmission.questionScores as QuestionScore[]).filter((q) => q.status === "incorrect").length}I /
                    {(practicalSubmission.questionScores as QuestionScore[]).filter((q) => q.status === "untouched").length}U
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Score</p>
                <p className="text-lg font-bold">
                  {attempt.totalScore ?? "-"} / {assessment.totalMcqMarks + assessment.totalPracticalMarks}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Percentage</p>
                <p className="text-lg font-bold">{attempt.percentage ?? "-"}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Final Result</p>
                <p className={`text-2xl font-bold ${
                  attempt.result === "PASS" ? "text-green-600" : attempt.result === "FAIL" ? "text-yellow-700" : "text-gray-400"
                }`}>
                  {attempt.result === "PASS" ? "PASSED" : attempt.result === "FAIL" ? "FAILED" : "Pending"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Evaluation Status</p>
                <p className={`text-lg font-bold ${attempt.evaluationDone ? "text-teal-600" : "text-purple-600"}`}>
                  {attempt.evaluationDone ? "Done" : "Pending"}
                </p>
              </div>
            </div>

            {attempt.result && (
              <div className={`rounded-lg p-4 mb-6 ${attempt.result === "PASS" ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <p className="text-sm font-medium">
                  {attempt.result === "PASS" ? (
                    <span className="text-green-800">Candidate has scored &ge;60% in both MCQ ({attempt.mcqScore}/{assessment.totalMcqMarks}) and Practical ({attempt.practicalScore}/{assessment.totalPracticalMarks}) sections.</span>
                  ) : (
                    <span className="text-yellow-800">
                      Candidate has scored below 60% in{" "}
                      {!mcqPassed && !pracPassed ? "both sections" : !mcqPassed ? "MCQ section" : "Practical section"}.
                      {" "}MCQ: {attempt.mcqScore}/{assessment.totalMcqMarks}, Practical: {attempt.practicalScore ?? "N/A"}/{assessment.totalPracticalMarks}.
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {attempt.startedAt && <p>Started: {new Date(attempt.startedAt).toLocaleString()}</p>}
                {attempt.mcqSubmittedAt && <p>MCQ Submitted: {new Date(attempt.mcqSubmittedAt).toLocaleString()}</p>}
                {attempt.practicalSubmittedAt && <p>Practical Submitted: {new Date(attempt.practicalSubmittedAt).toLocaleString()}</p>}
                {attempt.completedAt && <p>Completed: {new Date(attempt.completedAt).toLocaleString()}</p>}
                {attempt.evaluationDoneAt && <p>Evaluation Done: {new Date(attempt.evaluationDoneAt).toLocaleString()}</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
