"use client";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setScraped] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setScraped("");
    setSummary("");
    setError("");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      setScraped(data.scraped);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10 font-sans text-gray-600">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-2xl font-bold text-center">🧠 Web Audit Tool</h1>

        <input
          type="text"
          placeholder="Enter a URL (e.g. https://example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-black"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Processing..." : "Scrape and Audit"}
        </button>

        {error && (
          <div className="text-red-600 bg-red-100 p-3 rounded-md">{error}</div>
        )}

        {/* {scraped && (
          <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm max-h-64 overflow-auto whitespace-pre-wrap">
            <h2 className="text-lg font-semibold mb-2">📄 Scraped Content:</h2>
            {scraped}
          </div>
        )} */}

        {summary && (
          <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm whitespace-pre-wrap">
            <h2 className="text-lg font-semibold mb-2">Client Email Draft:</h2>
            <label htmlFor="summary" className="block mb-2 text-sm font-medium">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2 border rounded"
              rows={10}
            />
          </div>
        )}
      </div>
    </div>
  );
}
