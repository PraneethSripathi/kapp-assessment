"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PracticalAssessment() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [mcqScore, setMcqScore] = useState<number | null>(null);
  const [error, setError] = useState("");

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
        setMcqScore(data.mcqScore);

        if (data.status === "NOT_STARTED") {
          router.push("/candidate/dashboard");
        } else if (data.status === "MCQ_IN_PROGRESS") {
          router.push("/candidate/mcq");
        } else if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED", "EXPIRED"].includes(data.status)) {
          router.push("/candidate/complete");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDownload() {
    const attemptId = localStorage.getItem("attemptId");
    window.open(`/api/candidate/practical/download?attemptId=${attemptId}`, "_blank");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Only Excel files (.xlsx, .xls) are accepted");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("attemptId", localStorage.getItem("attemptId") || "");
      formData.append("file", file);

      const res = await fetch("/api/candidate/practical/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadedFile(data.fileUrl);
        setFileName(file.name);
        setStatus("PRACTICAL_IN_PROGRESS");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/candidate/submit-practical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: localStorage.getItem("attemptId") }),
      });

      if (res.ok) {
        router.push("/candidate/complete");
      } else {
        const data = await res.json();
        setError(data.error || "Submission failed");
      }
    } catch {
      setError("Submission failed. Please try again.");
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Practical Excel Assessment</h1>
          {mcqScore !== null && (
            <p className="text-sm text-gray-600 mb-6">
              MCQ Score: <strong>{mcqScore}/20</strong>
            </p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Download the practical assessment Excel workbook</li>
              <li>Open and complete all tasks using Microsoft Excel</li>
              <li>Use formulas/functions where appropriate</li>
              <li>Preserve source data except where a task requires correction</li>
              <li>Enter final answers in the designated answer cells</li>
              <li>Save your completed workbook</li>
              <li>Upload the completed file below</li>
              <li>Click Submit to finalize</li>
            </ol>
          </div>

          {/* Step 1: Download */}
          <div className="border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Step 1: Download Workbook</h3>
                <p className="text-sm text-gray-500">Download the practical assessment file</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Download
              </button>
            </div>
          </div>

          {/* Step 2: Upload */}
          <div className="border rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Step 2: Upload Completed Workbook</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                ) : uploadedFile ? (
                  <>
                    <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <p className="text-sm text-green-600 font-medium">{fileName}</p>
                    <p className="text-xs text-gray-500">Click to replace</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-sm text-gray-500">Click to upload Excel file</p>
                    <p className="text-xs text-gray-400">.xlsx or .xls (max 10MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          {/* Step 3: Submit */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!uploadedFile || submitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Submit Practical Assessment
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Submit Practical Assessment?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Once submitted, you cannot modify your practical submission. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
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
