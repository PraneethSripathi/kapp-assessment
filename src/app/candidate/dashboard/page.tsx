"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AttemptData {
  id: string;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  candidate: { name: string; role: string };
  assessment: { name: string; instructions: string; durationMins: number };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

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
        setAttempt(data);
        if (data.status === "MCQ_IN_PROGRESS") {
          router.push("/candidate/mcq");
        } else if (["MCQ_SUBMITTED", "PRACTICAL_IN_PROGRESS"].includes(data.status)) {
          router.push("/candidate/practical");
        } else if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED", "EXPIRED"].includes(data.status)) {
          router.push("/candidate/complete");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleStart() {
    setStarting(true);
    try {
      const attemptId = localStorage.getItem("attemptId");
      const res = await fetch("/api/candidate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/candidate/mcq");
      } else {
        alert(data.error || "Failed to start assessment");
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

  if (!attempt) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{attempt.assessment.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              <span>Candidate: <strong className="text-gray-900">{attempt.candidate.name}</strong></span>
              <span>Role: <strong className="text-gray-900">{attempt.candidate.role}</strong></span>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Assessment Instructions</h2>
            <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed">
              {attempt.assessment.instructions}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2">Important</h3>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>Total duration: <strong>{attempt.assessment.durationMins} minutes</strong> for both MCQ and Practical</li>
              <li>Timer starts when you click &quot;Start Test&quot;</li>
              <li>You cannot pause or reset the timer</li>
              <li>Ensure stable internet before starting</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 transition"
          >
            {starting ? "Starting..." : "Start Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
