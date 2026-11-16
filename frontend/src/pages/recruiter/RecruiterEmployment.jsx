
import React, { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Users,
  MapPin,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import api from "../../services/api";

const initialForm = {
  title: "",
  company: "",
  location: "",
  description: "",
  job_type: "Full-time",
  salary_range: "",
  skills: "",
  deadline: "",
};

export default function RecruiterEmployment() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/recruiter/jobs");
      setJobs(response.data.jobs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load job vacancies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateField = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const createJob = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      setSaving(true);
      const response = await api.post("/recruiter/jobs", form);
      setMessage(response.data.message || "Job vacancy created.");
      setForm(initialForm);
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create the job.");
    } finally {
      setSaving(false);
    }
  };

  const viewApplications = async (job) => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get(
        `/recruiter/jobs/${job.id}/applications`
      );

      setSelectedJob(response.data.job);
      setApplications(response.data.applications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load applicants.");
    } finally {
      setLoading(false);
    }
  };

  const updateApplication = async (applicationId, status) => {
    try {
      setError("");
      setMessage("");

      await api.put(
        `/recruiter/applications/${applicationId}/status`,
        { status }
      );

      setApplications((previous) =>
        previous.map((application) =>
          application.id === applicationId
            ? { ...application, status }
            : application
        )
      );

      setMessage("Applicant status updated.");
      await loadJobs();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update application status."
      );
    }
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      setError("");
      setMessage("");

      await api.put(`/recruiter/jobs/${jobId}/status`, { status });
      setMessage(`Job marked as ${status}.`);
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job status.");
    }
  };

  const statusStyle = (status) => {
    if (status === "Hired" || status === "Open") {
      return "bg-green-50 text-green-700";
    }
    if (status === "Rejected" || status === "Closed") {
      return "bg-red-50 text-red-700";
    }
    if (status === "Shortlisted") {
      return "bg-blue-50 text-blue-700";
    }
    return "bg-amber-50 text-amber-700";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-700">
              <BriefcaseBusiness size={23} />
              <span className="text-xs font-bold tracking-widest">
                NCCT EMPLOYMENT ECOSYSTEM
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Recruiter Employment
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Publish vacancies and manage trainee applications.
            </p>
          </div>

          <button
            onClick={loadJobs}
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

        {selectedJob ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setApplications([]);
                    setMessage("");
                    setError("");
                  }}
                  className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
                >
                  <ArrowLeft size={16} />
                  Back to vacancies
                </button>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedJob.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedJob.company} · Applicant list
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {applications.length} Applicants
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No applications received for this vacancy yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Trainee</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Cover Letter</th>
                      <th className="px-5 py-4">Application Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {application.trainee_name}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {application.trainee_email}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-600">
                          {application.cover_letter || "Not provided"}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={application.status}
                            onChange={(event) =>
                              updateApplication(
                                application.id,
                                event.target.value
                              )
                            }
                            className={`rounded-lg border-0 px-3 py-2 text-xs font-semibold ${statusStyle(
                              application.status
                            )}`}
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Hired">Hired</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Plus size={20} />
                </div>
                <h2 className="font-bold text-slate-900">Create Job Vacancy</h2>
              </div>

              <form onSubmit={createJob} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Job Title *
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    required
                    placeholder="e.g. Python Developer"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Company *
                  </label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={updateField}
                    required
                    placeholder="Company name"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={updateField}
                    placeholder="e.g. Pune, Maharashtra"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Job Description *
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    required
                    rows={4}
                    placeholder="Describe responsibilities and requirements..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Job Type
                    </label>
                    <select
                      name="job_type"
                      value={form.job_type}
                      onChange={updateField}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Internship</option>
                      <option>Contract</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Salary Range
                    </label>
                    <input
                      name="salary_range"
                      value={form.salary_range}
                      onChange={updateField}
                      placeholder="3-5 LPA"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Required Skills
                  </label>
                  <input
                    name="skills"
                    value={form.skills}
                    onChange={updateField}
                    placeholder="Python, SQL, React"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={updateField}
                    min={new Date().toLocaleDateString("en-CA")}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Plus size={17} />
                  {saving ? "Publishing..." : "Publish Job"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Your Vacancies</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Jobs published by your recruiter account.
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <BriefcaseBusiness size={20} />
                </div>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin" />
                  Loading vacancies...
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No vacancies published yet. Create your first job using the
                  form.
                </div>
              ) : (
                <div className="space-y-4 p-5">
                  {jobs.map((job) => (
                    <article
                      key={job.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {job.company}
                          </p>
                        </div>
                        <span
                          className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm text-slate-600">
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
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {job.application_count} applicants
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarDays size={14} />
                            Deadline: {job.deadline}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => viewApplications(job)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View Applicants ({job.application_count})
                        </button>
                        <button
                          onClick={() =>
                            updateJobStatus(
                              job.id,
                              job.status === "Open" ? "Closed" : "Open"
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {job.status === "Open" ? "Close Vacancy" : "Reopen"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
