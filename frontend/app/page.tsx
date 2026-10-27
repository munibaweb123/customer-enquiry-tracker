"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type EnquiryResponse = {
  id?: string;
  name?: string;
  email?: string;
  message?: string;
  category?: string | null;
  status?: string;
  categorization_state?: string;
  detail?: string | { msg?: string }[];
};

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isError, setIsError] = useState(false);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsError(false);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setFeedback("Please complete all fields.");
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const data: EnquiryResponse = await response.json();

      if (!response.ok) {
        const details = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg ?? "Invalid input").join(" ")
          : typeof data.detail === "string"
            ? data.detail
            : "Unable to submit your enquiry.";

        throw new Error(details);
      }

      // Redirect only after the backend accepts the enquiry.
      router.push("/dashboard");
    } catch (error) {
      setIsError(true);
      setFeedback(
        error instanceof TypeError
          ? "Cannot connect to the backend. Please check that the API server is running."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Customer Enquiry Tracker
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How can we help you?
          </h1>
          <p className="mt-3 text-slate-600">
            Send us your question and our team will get back to you.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">Submit an enquiry</h2>
          <p className="mt-1 text-sm text-slate-500">
            All fields are required.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium">
                How can we help?
              </label>
              <textarea
                id="message"
                name="message"
                required
                minLength={1}
                maxLength={10000}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe your enquiry..."
                className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {feedback && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                {feedback}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit enquiry"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Your enquiry will be saved for our team to review.
        </p>
      </div>
    </main>
  );
}