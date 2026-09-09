"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

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
        if (data.status === "NOT_STARTED") {
          router.push("/candidate/dashboard");
        } else if (data.status === "MCQ_IN_PROGRESS") {
          router.push("/candidate/mcq");
        } else if (data.status === "MCQ_SUBMITTED") {
          router.push("/candidate/practical");
        } else if (data.status === "PRACTICAL_IN_PROGRESS") {
          router.push("/candidate/practical/exam");
        } else {
          setValid(true);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!valid) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Submitted Successfully</h1>

          <p className="text-gray-600 mb-6">
            Your assessment has been submitted successfully. Your responses are being reviewed by our evaluation team.
            You will be notified of your results.
          </p>

          <p className="text-sm text-gray-400">
            Thank you for participating. You may now close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
