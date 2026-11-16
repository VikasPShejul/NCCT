
import React, { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Search,
  MapPin,
  CalendarDays,
  Send,
  RefreshCw,
  FileText,
  ClipboardList,
} from "lucide-react";
import api from "../../services/api";

export default function TraineeEmployment() {
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [coverLetters, setCoverLetters] = useState({});
  const [applyingId, setApplyingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadEmploymentData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [jobsResponse, applicationsResponse] = await Promise.all([
        api.get("/trainee/jobs"),
        api.get("/trainee/applications"),
      ]);

      setJobs(jobsResponse.data.jobs || []);
      setApplications(applicationsResponse.data.applications || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load employment information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmploymentData();
  }, [loadEmploymentData]);

  const applyForJob = async (jobId) => {
    try {
      setApplyingId(jobId);
      setError("");
      setMessage("");

      const response = await api.post(`/trainee/jobs/${jobId}/apply`, {
        cover_letter: coverLetters[jobId] || "",
      });

      setMessage(response.data.message || "Application submitted.");
      setCoverLetters((previous) => ({
        ...previous,
        [jobId]: "",
      }));

      await loadEmploymentData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to submit your application."
      );
    } finally {
      setApplyingId(null);
    }
  };

  const statusStyle = (status) => {
    if (status === "Hired") return "bg-green-50 text-green-700";
    if (status === "Rejected") return "bg-red-50 text-red-700";
    if (status === "Shortlisted") return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
  };

  const filteredJobs = jobs.filter((job) => {
    const query = search.toLowerCase();

    return (
      job.title?.toLowerCase().includes(query) ||
      job.company?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query) ||
      job.skills?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-700">
              <BriefcaseBusiness size={23} />
              <span className="text-xs font-bold tracking-widest">
                NCCT CAREER PORTAL
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Employment Opportunities
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Discover vacancies and track your job applications.
            </p>
          </div>

          <button
            onClick={loadEmploymentData}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              activeTab === "jobs"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            <Search size={17} />
            Browse Jobs
          </button>

          <button
            onClick={() => setActiveTab("applications")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              activeTab === "applications"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            <ClipboardList size={17} />
            My Applications ({applications.length})
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
            Loading employment information...
          </div>
        ) : activeTab === "jobs" ? (
          <>
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Search size={19} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by job title, company, location or skills..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            {filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <BriefcaseBusiness
                  className="mx-auto mb-4 text-slate-400"
                  size={42}
                />
                <h2 className="font-semibold text-slate-800">
                  No matching vacancies
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Try another search or check again later for new opportunities.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {filteredJobs.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                        <BriefcaseBusiness size={23} />
                      </div>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Open
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-slate-900">
                      {job.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-blue-700">
                      {job.company}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {job.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BriefcaseBusiness size={14} />
                        {job.job_type}
                      </span>
                      {job.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={14} />
                          Deadline: {job.deadline}
                        </span>
                      )}
                    </div>

                    {job.salary_range && (
                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Salary: {job.salary_range}
                      </p>
                    )}

                    {job.skills && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                          REQUIRED SKILLS
                        </p>
                        <p className="text-sm text-slate-700">{job.skills}</p>
                      </div>
                    )}

                    {job.already_applied ? (
                      <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
                        Application already submitted
                      </div>
                    ) : (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Cover Letter (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={coverLetters[job.id] || ""}
                          onChange={(event) =>
                            setCoverLetters((previous) => ({
                              ...previous,
                              [job.id]: event.target.value,
                            }))
                          }
                          placeholder="Briefly introduce yourself and explain your interest..."
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          onClick={() => applyForJob(job.id)}
                          disabled={applyingId === job.id}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Send size={16} />
                          {applyingId === job.id
                            ? "Submitting..."
                            : "Apply for this Job"}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">My Applications</h2>
              <p className="mt-1 text-sm text-slate-500">
                Track the status of every job you have applied for.
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="p-12 text-center">
                <FileText
                  className="mx-auto mb-3 text-slate-400"
                  size={40}
                />
                <h3 className="font-semibold text-slate-800">
                  No applications yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Browse available vacancies and submit your first application.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Job</th>
                      <th className="px-5 py-4">Company</th>
                      <th className="px-5 py-4">Applied On</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {application.job_title}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {application.company}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {application.applied_at
                            ? new Date(
                                application.applied_at
                              ).toLocaleDateString("en-IN")
                            : "Not available"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              application.status
                            )}`}
                          >
                            {application.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
