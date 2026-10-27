
"use client";

import { useCallback, useEffect, useState } from "react";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  status: "New" | "In Progress" | "Resolved";
  category: "Sales" | "Support" | "Billing" | "Other" | null;
  categorization_state: "Pending" | "Completed" | "Failed";
};

const API_URL = "http://127.0.0.1:8000/api/enquiries";

export default function DashboardPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const url =
        filter === "All"
          ? API_URL
          : `${API_URL}?status=${encodeURIComponent(filter)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load enquiries.");

      const data: Enquiry[] = await response.json();
      setEnquiries(data);
    } catch {
      setError("Cannot connect to the backend. Please check the API server.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadEnquiries();
  }, [loadEnquiries]);

  async function updateStatus(id: string, status: Enquiry["status"]) {
    setBusyId(id);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Could not update the enquiry status.");
      }

      setNotice("Enquiry status updated successfully.");
      await loadEnquiries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status update failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function retryCategorization(id: string) {
    setBusyId(id);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/${id}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.detail || "Could not retry categorization."
        );
      }

      setNotice("Categorization retry completed.");
      await loadEnquiries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Retry failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Customer Enquiry Tracker
            </p>
            <h1 className="mt-2 text-3xl font-bold">Enquiry Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Review enquiries, update their status, and manage categorization.
            </p>
          </div>

          <a
            href="/"
            className="inline-flex w-fit items-center rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800"
          >
            + New enquiry
          </a>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total shown", value: enquiries.length },
            {
              label: "Categorized",
              value: enquiries.filter(
                (item) => item.categorization_state === "Completed"
              ).length,
            },
            {
              label: "Needs retry",
              value: enquiries.filter(
                (item) => item.categorization_state === "Failed"
              ).length,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">All enquiries</h2>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Filter:
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="All">All statuses</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <button
                type="button"
                onClick={() => void loadEnquiries()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {notice && (
            <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Loading enquiries...
            </p>
          ) : enquiries.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              No enquiries found for this filter.
            </p>
          ) : (
            <div className="space-y-4">
              {enquiries.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold">
                        {item.name}
                      </h3>
                      <p className="break-words text-sm text-slate-500">
                        {item.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>

                      <div className="mt-4 rounded-lg bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {item.message}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800">
                          Status: {item.status}
                        </span>
                        <span className="rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-800">
                          Category: {item.category ?? "Not assigned"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 font-medium ${
                            item.categorization_state === "Completed"
                              ? "bg-green-50 text-green-800"
                              : item.categorization_state === "Failed"
                                ? "bg-red-50 text-red-800"
                                : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          Categorization: {item.categorization_state}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:w-52">
                      <label
                        htmlFor={`status-${item.id}`}
                        className="text-sm font-medium"
                      >
                        Update status
                      </label>
                      <select
                        id={`status-${item.id}`}
                        value={item.status}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          void updateStatus(
                            item.id,
                            event.target.value as Enquiry["status"]
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>

                      {item.categorization_state !== "Completed" && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void retryCategorization(item.id)}
                          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                          {busyId === item.id
                            ? "Please wait..."
                            : "Retry categorization"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
