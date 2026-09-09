"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
  optionText: string;
}

interface Question {
  id: string;
  questionText: string;
  category: string;
  difficulty: string;
  orderIndex: number;
  marks: number;
  options: Option[];
  selectedOptionId: string | null;
}

export default function McqAssessment() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const attemptIdRef = useRef<string>("");
  const submitCalledRef = useRef(false);

  const loadQuestions = useCallback(async () => {
    const attemptId = localStorage.getItem("attemptId");
    if (!attemptId) {
      router.push("/");
      return;
    }
    attemptIdRef.current = attemptId;

    const attemptRes = await fetch(`/api/candidate/attempt?attemptId=${attemptId}`);
    const attemptData = await attemptRes.json();

    if (attemptData.error || !["MCQ_IN_PROGRESS"].includes(attemptData.status)) {
      if (attemptData.status === "MCQ_SUBMITTED") {
        router.push("/candidate/practical");
      } else if (attemptData.status === "PRACTICAL_IN_PROGRESS") {
        router.push("/candidate/practical/exam");
      } else if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED"].includes(attemptData.status)) {
        router.push("/candidate/complete");
      } else {
        router.push("/");
      }
      return;
    }

    if (attemptData.expiresAt) {
      setExpiresAt(new Date(attemptData.expiresAt));
    }

    const qRes = await fetch(`/api/candidate/questions?attemptId=${attemptId}`);
    const qData = await qRes.json();

    if (qData.error) {
      if (qRes.status === 410) {
        setExpired(true);
      }
      return;
    }

    setQuestions(qData.questions);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("00:00");
        clearInterval(interval);
        handleSubmit(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  async function saveAnswer(questionId: string, selectedOptionId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/candidate/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attemptIdRef.current,
          questionId,
          selectedOptionId,
        }),
      });

      if (res.status === 410) {
        setExpired(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        console.error("Save failed:", data.error);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleOptionSelect(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selectedOptionId: optionId } : q))
    );
    saveAnswer(questionId, optionId);
  }

  async function handleSubmit(auto = false) {
    if (submitCalledRef.current) return;
    submitCalledRef.current = true;
    setSubmitting(true);

    try {
      const res = await fetch("/api/candidate/submit-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attemptIdRef.current }),
      });

      if (res.ok) {
        router.push("/candidate/practical");
      }
    } catch (err) {
      console.error("Submit error:", err);
      submitCalledRef.current = false;
      if (!auto) alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (expired && !submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">MCQ Time Expired</h2>
          <p className="text-gray-600 mb-4">Your MCQ time has expired. Your answers have been automatically submitted.</p>
          <button
            onClick={() => router.push("/candidate/practical")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Continue to Practical Assessment
          </button>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.selectedOptionId).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeLow = expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      {/* Header with timer and global submit */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            MCQ Assessment &middot; Question {currentIndex + 1} of {questions.length}
          </div>
          <div className={`font-mono text-lg font-bold px-4 py-1.5 rounded-lg ${
            isTimeLow ? "bg-red-50 text-red-600 animate-pulse border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {timeLeft}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {answeredCount}/{questions.length} answered
              {saving && <span className="ml-2 text-blue-500">Saving...</span>}
            </span>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              Submit MCQ
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Question Navigation Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 p-5 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Questions</h3>
          <div className="grid grid-cols-5 gap-2.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                  i === currentIndex
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : q.selectedOptionId
                    ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-5 text-xs text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-blue-600 rounded-md shadow-sm" /> Current
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-md" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-gray-100 rounded-md" /> Unanswered
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <main className="flex-1 p-4 md:p-8 bg-[#f5f7fb]">
          {current && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-5">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                  {current.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                  {current.difficulty}
                </span>
                <span className="ml-auto text-sm font-medium text-gray-500">{current.marks} mark</span>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <h2 className="text-base font-medium text-gray-900 leading-relaxed">
                  <span className="text-blue-600 font-bold mr-2">Q{current.orderIndex}.</span>
                  {current.questionText}
                </h2>
              </div>

              <div className="space-y-3">
                {current.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all bg-white ${
                      current.selectedOptionId === opt.id
                        ? "border-blue-500 bg-blue-50 shadow-sm shadow-blue-100"
                        : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${current.id}`}
                      checked={current.selectedOptionId === opt.id}
                      onChange={() => handleOptionSelect(current.id, opt.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-700 mr-2">{opt.label}.</span>
                      <span className="text-gray-800">{opt.optionText}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 transition bg-white"
                >
                  Previous
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-sm"
                  >
                    Submit MCQ
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
                  >
                    Next
                  </button>
                )}
              </div>

              {/* Mobile question navigator */}
              <div className="md:hidden mt-6">
                <div className="flex flex-wrap gap-2 justify-center">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-semibold ${
                        i === currentIndex
                          ? "bg-blue-600 text-white shadow-sm"
                          : q.selectedOptionId
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                {/* Mobile submit button */}
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="w-full mt-4 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                >
                  Submit MCQ
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Submit MCQ Assessment?</h3>
            <div className="text-sm text-gray-600 mb-4">
              <p className="mb-2">You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.</p>
              {unansweredCount > 0 && (
                <p className="text-amber-600 font-medium">
                  {unansweredCount} question(s) are unanswered and will not be scored.
                </p>
              )}
              <p className="mt-2 text-gray-500">Once submitted, you cannot return to the MCQ section.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Go Back
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {submitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
