"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Config {
  id: string;
  name: string;
  durationMins: number;
  mcqPassingScore: number;
  practicalPassingScore: number;
  overallPassingScore: number;
  totalMcqMarks: number;
  totalPracticalMarks: number;
}

export default function AdminConfigPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/admin/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .finally(() => setLoading(false));
  }, [authStatus]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMins: config.durationMins,
          mcqPassingScore: config.mcqPassingScore,
          practicalPassingScore: config.practicalPassingScore,
          overallPassingScore: config.overallPassingScore,
        }),
      });

      if (res.ok) {
        setMessage("Settings saved successfully");
      } else {
        setMessage("Failed to save");
      }
    } catch {
      setMessage("Network error");
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

  if (!config || !session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-blue-600 hover:underline text-sm">&larr; Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">Assessment Configuration</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Duration (minutes)</label>
            <input
              type="number"
              min={5}
              max={300}
              value={config.durationMins}
              onChange={(e) => setConfig({ ...config, durationMins: parseInt(e.target.value) || 45 })}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MCQ Passing Score</label>
              <input
                type="number"
                min={0}
                max={config.totalMcqMarks}
                step={0.5}
                value={config.mcqPassingScore}
                onChange={(e) => setConfig({ ...config, mcqPassingScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Out of {config.totalMcqMarks}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Practical Passing Score</label>
              <input
                type="number"
                min={0}
                max={config.totalPracticalMarks}
                step={0.5}
                value={config.practicalPassingScore}
                onChange={(e) => setConfig({ ...config, practicalPassingScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Out of {config.totalPracticalMarks}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Passing Score</label>
            <input
              type="number"
              min={0}
              max={config.totalMcqMarks + config.totalPracticalMarks}
              step={0.5}
              value={config.overallPassingScore}
              onChange={(e) => setConfig({ ...config, overallPassingScore: parseFloat(e.target.value) || 0 })}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Out of {config.totalMcqMarks + config.totalPracticalMarks}</p>
          </div>

          {message && (
            <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </main>
    </div>
  );
}
