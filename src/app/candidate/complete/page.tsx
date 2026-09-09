"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

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
        setStatus(data.status);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete</h1>

          {status === "EVALUATION_PENDING" ? (
            <p className="text-gray-600 mb-6">
              Your assessment has been submitted successfully. Your responses are being reviewed by our evaluation team.
              You will be notified of your results.
            </p>
          ) : status === "COMPLETED" ? (
            <p className="text-gray-600 mb-6">
              Your assessment has been evaluated. Thank you for participating.
            </p>
          ) : status === "EXPIRED" ? (
            <p className="text-gray-600 mb-6">
              Your assessment time has expired. Any answers saved before expiration have been recorded.
            </p>
          ) : (
            <p className="text-gray-600 mb-6">
              Thank you for completing the assessment.
            </p>
          )}

          <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
            Status: <strong className="text-gray-900">{status.replace(/_/g, " ")}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
