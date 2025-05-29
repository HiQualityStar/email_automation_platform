"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import axios from "axios";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setScraped] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setScraped("");
    setSummary("");
    setSubject(""); // reset
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

      // ✅ Extract subject from the first line like "Subject: Something"
      const firstLine = data.summary
        .split("\n")[0]
        .replace(/^Subject:\s*/i, "")
        .trim();
      setSubject(firstLine);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
  };

  // const config = {
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // };
  const sendEmail = async () => {
    if (!sendTo) {
      alert("Please enter email address");
      return;
    }

    try {
      const res = await axios.post(
        "/api/send-audit",
        {
          to: sendTo,
          subject: subject,
          text: summary,
          html: `<div>${summary}</div>`,
        }
        // Optional: include headers like config if needed
      );

      if (res.data.success) {
        console.log("Email sent successfully");
      } else {
        console.error("Email send failed:", res.data);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-700 flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 bg-white shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Web Audit AI</h1>
        <a
          href="#contact"
          className="text-sm font-medium hover:underline text-blue-600"
        >
          Contact
        </a>
      </header>

      {/* Hero Section */}
      <section className="flex-1 px-6 py-16 flex flex-col items-center text-center bg-gradient-to-br from-white to-blue-50">
        <h2 className="text-4xl font-bold mb-4 text-gray-800 max-w-2xl">
          Turn Any Website into a Client-Ready Report in Seconds
        </h2>
        <p className="text-lg mb-8 text-gray-600 max-w-xl">
          Paste any URL and instantly generate a professional email summary for
          your client. Perfect for marketers, agencies, and auditors.
        </p>

        <div className="w-full max-w-2xl space-y-4">
          <input
            type="text"
            placeholder="Enter a URL (e.g. https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Processing..." : "Generate Client Email"}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md max-w-2xl w-full text-left">
            {error}
          </div>
        )}
      </section>

      {/* Output Section */}
      {summary && (
        <section className="px-6 py-12 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto space-y-6">
            <h3 className="text-3xl font-bold text-gray-800">
              Client Email Draft
            </h3>

            <div className="relative">
              <label
                htmlFor="summary"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Draft Content
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={12}
                className="w-full p-4 border border-gray-300 rounded-md font-mono text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 shadow-md transition-all"
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-600">Send to:</label>
              <div className="text-base text-gray-800 font-medium">
                <input
                  className="border border-gray-600 rounded-md w-64 px-2"
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={sendEmail}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-all shadow"
            >
              Send Email
            </button>
          </div>
        </section>
      )}

      {/* Contact + Footer */}
      <footer
        id="contact"
        className="mt-auto bg-gray-100 border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-600"
      >
        <p>
          Built by{" "}
          <a href="#" className="text-blue-600 font-medium hover:underline">
            YourCompany
          </a>
        </p>
        <p className="mt-1">
          Contact:{" "}
          <a href="mailto:support@yourcompany.com" className="underline">
            support@yourcompany.com
          </a>
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} Web Audit AI. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
