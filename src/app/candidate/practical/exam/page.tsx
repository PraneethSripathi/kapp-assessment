"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PracticalExam() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [practicalExpiresAt, setPracticalExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const submitCalledRef = useRef(false);

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
        } else if (["PRACTICAL_SUBMITTED", "EVALUATION_PENDING", "COMPLETED", "EXPIRED"].includes(data.status)) {
          router.push("/candidate/complete");
        } else if (data.status === "PRACTICAL_IN_PROGRESS") {
          if (data.practicalExpiresAt) {
            setPracticalExpiresAt(new Date(data.practicalExpiresAt));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Practical timer
  useEffect(() => {
    if (!practicalExpiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = practicalExpiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("00:00");
        clearInterval(interval);
        handleAutoSubmit();
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practicalExpiresAt]);

  async function handleAutoSubmit() {
    if (submitCalledRef.current) return;
    submitCalledRef.current = true;
    setSubmitting(true);
    try {
      const attemptId = localStorage.getItem("attemptId");
      await fetch("/api/candidate/submit-practical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      router.push("/candidate/complete");
    } catch {
      submitCalledRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

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
        setFileName(data.originalFilename || file.name);
        setFileSize(data.fileSize || file.size);
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
    if (submitCalledRef.current) return;
    submitCalledRef.current = true;
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
        submitCalledRef.current = false;
      }
    } catch {
      setError("Submission failed. Please try again.");
      submitCalledRef.current = false;
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <h2 className="text-xl font-bold text-red-600 mb-2">Practical Time Expired</h2>
          <p className="text-gray-600 mb-4">Your practical assessment time has expired. Your work has been automatically submitted.</p>
          <button
            onClick={() => router.push("/candidate/complete")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            View Confirmation
          </button>
        </div>
      </div>
    );
  }

  const isTimeLow = practicalExpiresAt && practicalExpiresAt.getTime() - Date.now() < 3 * 60 * 1000;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      {/* Header with timer */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">Practical Assessment</div>
          <div className={`font-mono text-lg font-bold px-4 py-1.5 rounded-lg ${
            isTimeLow ? "bg-red-50 text-red-600 animate-pulse border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            {timeLeft}
          </div>
          <button
            onClick={() => {
              if (uploadedFile) {
                setShowConfirm(true);
              } else {
                setError("Please upload your completed Excel file before submitting.");
              }
            }}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            Submit Practical
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Step 1: Download */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h3 className="font-medium text-gray-900">Download Workbook</h3>
                  <p className="text-sm text-gray-500">Download the practical assessment Excel file</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
            </div>
          </div>

          {/* Step 2: Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h3 className="font-medium text-gray-900">Upload Completed Workbook</h3>
                <p className="text-sm text-gray-500">Upload your completed Excel file</p>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                ) : uploadedFile ? (
                  <>
                    <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <p className="text-sm text-green-600 font-medium">{fileName}</p>
                    {fileSize && <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>}
                    <p className="text-xs text-gray-400 mt-1">Click to replace</p>
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

            {uploadedFile && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                File uploaded successfully
              </div>
            )}
          </div>

          {/* Step 3: Submit */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h3 className="font-medium text-gray-900">Submit Assessment</h3>
                <p className="text-sm text-gray-500">Finalize and submit your practical work</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (uploadedFile) {
                  setShowConfirm(true);
                } else {
                  setError("Please upload your completed Excel file before submitting.");
                }
              }}
              disabled={!uploadedFile || submitting}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Submit Practical Assessment
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
        </div>
      </main>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Submit Practical Assessment?</h3>
            <p className="text-sm text-gray-600 mb-2">
              Once submitted, you cannot modify your practical submission.
            </p>
            {fileName && (
              <p className="text-sm text-gray-500 mb-4">
                File: <strong>{fileName}</strong>
              </p>
            )}
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
