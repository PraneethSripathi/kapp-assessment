"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AttemptData {
  id: string;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  candidate: { name: string; role: string };
  assessment: { name: string; instructions: string; durationMins: number; mcqDurationMins: number; practicalDurationMins: number };
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
        } else if (data.status === "MCQ_SUBMITTED") {
          router.push("/candidate/practical");
        } else if (data.status === "PRACTICAL_IN_PROGRESS") {
          router.push("/candidate/practical/exam");
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

  const mcqMins = attempt.assessment.mcqDurationMins || 30;
  const practicalMins = attempt.assessment.practicalDurationMins || 15;

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

          <div className="prose prose-sm max-w-none text-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Assessment Instructions</h2>
            <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed">
              {attempt.assessment.instructions}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-3">Assessment Structure</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-900">MCQ Assessment</p>
                  <p className="text-sm text-gray-600">20 Questions — Maximum Time: <strong>{mcqMins} Minutes</strong></p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-900">Practical Assessment</p>
                  <p className="text-sm text-gray-600">5 Questions — Maximum Time: <strong>{practicalMins} Minutes</strong></p>
                </div>
              </div>
              <div className="text-center pt-1">
                <p className="text-sm font-semibold text-blue-800">Total Assessment Duration: Maximum {mcqMins + practicalMins} Minutes</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2">Important</h3>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>MCQ section: <strong>{mcqMins} minutes</strong> — timer starts when you click &quot;Start Test&quot;</li>
              <li>Practical section: <strong>{practicalMins} minutes</strong> — timer starts separately when you begin the practical</li>
              <li>Each section has its own independent timer</li>
              <li>You cannot pause or reset the timers</li>
              <li>Sections auto-submit when their timer expires</li>
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
