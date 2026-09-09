"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PracticalInstructions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [practicalMins, setPracticalMins] = useState(15);

  useEffect(() => {
    const attemptId = localStorage.getItem("attemptId");
    if (!attemptId) {
      router.push("/");
      return;
    }

    fetch(`/api/candidate/attempt?attemptId=${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/");
          return;
        }

        setPracticalMins(data.assessment?.practicalDurationMins || 15);

        if (data.status === "NOT_STARTED") {
          router.push("/candidate/dashboard");
        } else if (data.status === "MCQ_IN_PROGRESS") {
          router.push("/candidate/mcq");
        } else if (data.status === "PRACTICAL_IN_PROGRESS") {
          router.push("/candidate/practical/exam");
        } else if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED", "EXPIRED"].includes(data.status)) {
          router.push("/candidate/complete");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleStartPractical() {
    setStarting(true);
    try {
      const attemptId = localStorage.getItem("attemptId");
      const res = await fetch("/api/candidate/start-practical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/candidate/practical/exam");
      } else {
        alert(data.error || "Failed to start practical assessment");
      }
    } catch {
      alert("Network error");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practical Assessment</h1>
              <p className="text-sm text-gray-500">Excel-based Practical Evaluation</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="font-semibold text-emerald-800">Assessment Details</h3>
            </div>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li><strong>Questions:</strong> 5 Practical Tasks</li>
              <li><strong>Maximum Time:</strong> {practicalMins} Minutes</li>
              <li><strong>Format:</strong> Excel Workbook</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>After clicking &quot;Start Test&quot;, an Excel workbook will be available for download</li>
              <li>Download the provided Excel assessment file</li>
              <li>Open the file in Microsoft Excel and complete all required tasks</li>
              <li>Use formulas and functions where appropriate</li>
              <li>Preserve source data except where a task requires correction</li>
              <li>Enter final answers in the designated answer cells</li>
              <li>Save your completed workbook</li>
              <li>Upload the completed file back into the system</li>
              <li>Click &quot;Submit Practical Assessment&quot; to finalize</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2">Important</h3>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>The <strong>{practicalMins}-minute timer</strong> starts only when you click &quot;Start Test&quot;</li>
              <li>The timer does not reset on page refresh</li>
              <li>If the timer expires, your assessment will be <strong>automatically submitted</strong> with whatever work you have uploaded</li>
              <li>You can submit early once you have uploaded your completed file</li>
              <li>Only Excel files (.xlsx, .xls) are accepted for upload</li>
            </ul>
          </div>

          <button
            onClick={handleStartPractical}
            disabled={starting}
            className="w-full bg-emerald-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {starting ? "Starting..." : "Start Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
