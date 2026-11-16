
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  UserCheck,
  CalendarDays,
  Search,
  Bell,
  Menu,
  X,
  Plus,
  MapPin,
  MoreHorizontal,
  Building2,
  LogOut,
  FileText,
  Settings,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Manage Jobs", icon: BriefcaseBusiness },
  { label: "Applications", icon: FileText },
  { label: "Candidates", icon: Users },
  { label: "Interviews", icon: CalendarDays },
];

function RecruiterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const recruiterName = user?.full_name || "Recruiter";
  const companyName = user?.company_name || "Your Company";

  // =====================================================
  // LOAD JOBS AND APPLICATIONS FROM FLASK
  // =====================================================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/recruiter/jobs");

      const jobList = response.data.jobs || [];

      setJobs(jobList);

      // Load applicants for each job
      const applicationResponses = await Promise.all(
        jobList.map(async (job) => {
          try {
            const result = await api.get(
              `/recruiter/jobs/${job.id}/applications`
            );

            return (result.data.applications || []).map((application) => ({
              ...application,
              job_id: job.id,
              role: job.title,
            }));
          } catch (err) {
            console.error(
              `Could not load applications for job ${job.id}`,
              err
            );
            return [];
          }
        })
      );

      setApplicants(applicationResponses.flat());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load recruiter dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =====================================================
  // SEARCH APPLICANTS
  // =====================================================

  const filteredApplicants = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return applicants.filter((applicant) =>
      [
        applicant.trainee_name,
        applicant.trainee_email,
        applicant.role,
        applicant.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [applicants, searchTerm]);

  // =====================================================
  // UPDATE APPLICATION STATUS
  // =====================================================

  const updateApplicantStatus = async (id, status) => {
    try {
      setError("");
      setSuccess("");

      await api.put(`/recruiter/applications/${id}/status`, {
        status,
      });

      setApplicants((previous) =>
        previous.map((applicant) =>
          applicant.id === id
            ? { ...applicant, status }
            : applicant
        )
      );

      setSuccess("Application status updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update application status."
      );
    }
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleMenuClick = (label) => {
    setActiveMenu(label);
    setSidebarOpen(false);

    if (label === "Manage Jobs" ||
        label === "Applications" ||
        label === "Candidates" ||
        label === "Interviews") {
      navigate("/recruiter/employment");
    }
  };

  const handlePostJob = () => {
    navigate("/recruiter/employment");
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Unable to logout. Please try again.");
    }
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-IN");
  };

  // =====================================================
  // STATUS STYLING
  // =====================================================

  const statusStyle = {
    Applied: "bg-yellow-50 text-yellow-700",
    Shortlisted: "bg-green-50 text-green-700",
    Interview: "bg-blue-50 text-blue-700",
    Rejected: "bg-red-50 text-red-700",
    Hired: "bg-emerald-50 text-emerald-700",
  };

  // =====================================================
  // DYNAMIC DASHBOARD STATISTICS
  // =====================================================

  const totalJobs = jobs.length;

  const totalApplications = applicants.length;

  const shortlisted = applicants.filter(
    (item) => item.status === "Shortlisted"
  ).length;

  const hired = applicants.filter(
    (item) => item.status === "Hired"
  ).length;

  const stats = [
    {
      title: "Total Job Posts",
      value: totalJobs,
      change: `${jobs.filter((job) => job.status === "Open").length} active vacancies`,
      icon: BriefcaseBusiness,
      background: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Applications",
      value: totalApplications,
      change: "Applications received",
      icon: Users,
      background: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Shortlisted",
      value: shortlisted,
      change: "Candidates shortlisted",
      icon: UserCheck,
      background: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Hired Candidates",
      value: hired,
      change: "Successful placements",
      icon: CheckCircle2,
      background: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  // =====================================================
  // APPLICATION PIPELINE
  // =====================================================

  const pipeline = [
    {
      label: "Applied",
      value: applicants.filter((a) => a.status === "Applied").length,
      color: "bg-yellow-400",
    },
    {
      label: "Shortlisted",
      value: shortlisted,
      color: "bg-green-500",
    },
    {
      label: "Hired",
      value: hired,
      color: "bg-blue-500",
    },
    {
      label: "Rejected",
      value: applicants.filter((a) => a.status === "Rejected").length,
      color: "bg-red-400",
    },
  ];

  const getPercentage = (value) => {
    if (totalApplications === 0) return 0;
    return Math.round((value / totalApplications) * 100);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-800">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">NCCT</h1>
              <p className="text-xs text-slate-500">Recruiter Portal</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeMenu === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => handleMenuClick(item.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}

                  {item.label === "Applications" &&
                    totalApplications > 0 && (
                      <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        {totalApplications}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          <p className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          <button
            onClick={() => setActiveMenu("Settings")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
              activeMenu === "Settings"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Settings size={19} />
            Settings
          </button>
        </div>

        <div className="mt-auto border-t border-slate-100 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {recruiterName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {recruiterName}
              </p>
              <p className="truncate text-xs text-slate-500">
                Recruiter
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="min-h-screen w-full min-w-0 lg:ml-64 lg:w-[calc(100%-16rem)]">

        {/* TOP NAVIGATION */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Dashboard
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                Recruiter workspace / Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={loadDashboard}
              title="Refresh dashboard"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <RefreshCw size={19} />
            </button>

            <div className="relative rounded-xl p-2 text-slate-500">
              <Bell size={21} />
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {recruiterName}
              </p>
              <p className="text-xs text-slate-500">{companyName}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {recruiterName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="w-full min-w-0 space-y-7 px-4 py-5 sm:px-6 lg:px-8">

          {/* ERROR AND SUCCESS MESSAGES */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}

          {/* WELCOME SECTION */}

          <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="mb-2 text-sm text-blue-100">
                Recruiter Dashboard
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Welcome back, {recruiterName}!
              </h1>

              <p className="mt-2 max-w-xl text-sm text-blue-100">
                Find skilled candidates, manage job postings and build your
                workforce with the NCCT employment ecosystem.
              </p>
            </div>

            <button
              onClick={handlePostJob}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow hover:bg-blue-50"
            >
              <Plus size={18} />
              Post a Job
            </button>
          </section>

          {/* LOADING */}

          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
              <RefreshCw
                size={28}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />
              <p className="text-sm text-slate-500">
                Loading recruiter dashboard...
              </p>
            </div>
          ) : (
            <>
              {/* STATISTICS */}

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.title}
                      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            {stat.title}
                          </p>

                          <h3 className="mt-3 text-3xl font-bold text-slate-900">
                            {stat.value}
                          </h3>
                        </div>

                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.background} ${stat.iconColor}`}
                        >
                          <Icon size={23} />
                        </div>
                      </div>

                      <p className="mt-4 text-xs font-medium text-slate-500">
                        {stat.change}
                      </p>
                    </div>
                  );
                })}
              </section>

              {/* RECENT JOB POSTS */}

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Recent Job Posts
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Your latest recruitment openings
                    </p>
                  </div>

                  <button
                    onClick={handlePostJob}
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View all jobs <ChevronRight size={17} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Job Title</th>
                        <th className="px-6 py-4 font-semibold">Location</th>
                        <th className="px-6 py-4 font-semibold">Applications</th>
                        <th className="px-6 py-4 font-semibold">Deadline</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {jobs.slice(0, 5).map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">
                              {job.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {job.company} · {job.job_type}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {job.location || "Not specified"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                            {job.application_count ?? 0}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-500">
                            {job.deadline || "Not specified"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                job.status === "Open"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {job.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={handlePostJob}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                              title="Manage job"
                            >
                              <MoreHorizontal size={19} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {jobs.length === 0 && (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-10 text-center text-sm text-slate-500"
                          >
                            No jobs posted yet. Click Post a Job to create
                            your first vacancy.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* RECENT APPLICATIONS */}

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Recent Applications
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Review and manage candidates applying for your jobs
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Candidate</th>
                        <th className="px-6 py-4 font-semibold">Applied For</th>
                        <th className="px-6 py-4 font-semibold">Applied Date</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Update Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredApplicants.slice(0, 10).map((applicant) => (
                        <tr key={applicant.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                {(applicant.trainee_name || "T")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {applicant.trainee_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {applicant.trainee_email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {applicant.role}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-500">
                            {formatDate(applicant.applied_at)}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                statusStyle[applicant.status] ||
                                "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {applicant.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <select
                              value={applicant.status}
                              onChange={(e) =>
                                updateApplicantStatus(
                                  applicant.id,
                                  e.target.value
                                )
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-blue-500"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Hired">Hired</option>
                            </select>
                          </td>
                        </tr>
                      ))}

                      {filteredApplicants.length === 0 && (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-10 text-center text-sm text-slate-500"
                          >
                            No applications found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <p className="text-xs text-slate-500">
                    Showing {Math.min(filteredApplicants.length, 10)} of{" "}
                    {filteredApplicants.length} candidates
                  </p>

                  <button
                    onClick={() => navigate("/recruiter/employment")}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View all applications
                  </button>
                </div>
              </section>

              {/* APPLICATION PIPELINE */}

              <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-green-50 p-3 text-green-600">
                      <TrendingUp size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Candidate Pipeline
                      </h3>
                      <p className="text-xs text-slate-500">
                        Actual application status overview
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {pipeline.map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-slate-600">
                            {item.label}
                          </span>

                          <span className="font-semibold text-slate-800">
                            {item.value} ({getPercentage(item.value)}%)
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{
                              width: `${getPercentage(item.value)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {totalApplications === 0 && (
                      <p className="text-xs text-slate-400">
                        Pipeline statistics will appear after applications
                        are received.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                      <CalendarDays size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Recruitment Overview
                      </h3>
                      <p className="text-xs text-slate-500">
                        Current recruitment activity
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Open Vacancies
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Currently accepting applications
                        </p>
                      </div>

                      <span className="text-2xl font-bold text-blue-700">
                        {jobs.filter((job) => job.status === "Open").length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Closed Vacancies
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          No longer accepting applications
                        </p>
                      </div>

                      <span className="text-2xl font-bold text-slate-700">
                        {jobs.filter((job) => job.status === "Closed").length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Successful Hires
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Candidates selected
                        </p>
                      </div>

                      <span className="text-2xl font-bold text-green-700">
                        {hired}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <footer className="pb-4 text-center text-xs text-slate-400">
            © 2026 NCCT Employment Ecosystem. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}

export default RecruiterDashboard;
