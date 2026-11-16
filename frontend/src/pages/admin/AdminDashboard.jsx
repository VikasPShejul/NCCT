import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Award,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  Plus,
  ArrowUpRight,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  UserCheck,
  FileText,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const emptyData = {
  stats: {},
  trainees: [],
  trainers: [],
  recruiters: [],
  institutions: [],
  programmes: [],
  courses: [],
  attendance: [],
  certificates: [],
  jobs: [],
  applications: [],
  monthlyEnrollments: [],
  trainingProgress: {
    completed: 0,
    in_progress: 0,
  },
};

const getArray = (response, keys = []) => {
  if (!response) return [];

  if (Array.isArray(response.data)) {
    return response.data;
  }

  for (const key of keys) {
    if (Array.isArray(response.data?.[key])) {
      return response.data[key];
    }
  }

  return [];
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN");
};

function AdminDashboard() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const [data, setData] = useState(emptyData);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Institutions", icon: Building2 },
    { name: "Trainees", icon: Users },
    { name: "Trainers", icon: GraduationCap },
    { name: "Recruiters", icon: UserCheck },
    { name: "Programmes", icon: GraduationCap },
    { name: "Courses & LMS", icon: BookOpen },
    { name: "Attendance", icon: CalendarDays },
    { name: "Certificates", icon: Award },
    { name: "Employment", icon: Briefcase },
    { name: "Analytics", icon: BarChart3 },
    { name: "Settings", icon: Settings },
  ];

  // -----------------------------------------------------
  // LOAD ADMIN DASHBOARD DATA
  // -----------------------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const requests = [
      api.get("/admin/dashboard"),
      api.get("/admin/trainees"),
      api.get("/admin/trainers"),
      api.get("/admin/recruiters"),
      api.get("/admin/institutions"),
      api.get("/admin/programmes"),
      api.get("/admin/courses"),
      api.get("/admin/attendance"),
      api.get("/admin/certificates"),
      api.get("/admin/jobs"),
      api.get("/admin/applications"),
    ];

    const results = await Promise.allSettled(requests);

    const [
      dashboardResult,
      traineesResult,
      trainersResult,
      recruitersResult,
      institutionsResult,
      programmesResult,
      coursesResult,
      attendanceResult,
      certificatesResult,
      jobsResult,
      applicationsResult,
    ] = results;

    const nextData = {
      ...emptyData,
      stats: {},
      monthlyEnrollments: [],
      trainingProgress: {
        completed: 0,
        in_progress: 0,
      },
    };

    const failedSections = [];

    if (dashboardResult.status === "fulfilled") {
      const dashboard = dashboardResult.value.data || {};

      nextData.stats = dashboard.stats || {};

      nextData.monthlyEnrollments =
        dashboard.monthly_enrollments || [];

      nextData.trainingProgress =
        dashboard.training_progress || {
          completed: 0,
          in_progress: 0,
        };
    } else {
      failedSections.push("dashboard statistics");
    }

    const moduleResults = [
      {
        result: traineesResult,
        property: "trainees",
        keys: ["trainees", "users"],
      },
      {
        result: trainersResult,
        property: "trainers",
        keys: ["trainers"],
      },
      {
        result: recruitersResult,
        property: "recruiters",
        keys: ["recruiters"],
      },
      {
        result: institutionsResult,
        property: "institutions",
        keys: ["institutions"],
      },
      {
        result: programmesResult,
        property: "programmes",
        keys: ["programmes"],
      },
      {
        result: coursesResult,
        property: "courses",
        keys: ["courses"],
      },
      {
        result: attendanceResult,
        property: "attendance",
        keys: ["attendance", "records"],
      },
      {
        result: certificatesResult,
        property: "certificates",
        keys: ["certificates"],
      },
      {
        result: jobsResult,
        property: "jobs",
        keys: ["jobs"],
      },
      {
        result: applicationsResult,
        property: "applications",
        keys: ["applications"],
      },
    ];

    moduleResults.forEach(({ result, property, keys }) => {
      if (result.status === "fulfilled") {
        nextData[property] = getArray(result.value, keys);
      } else {
        failedSections.push(property);
      }
    });

    setData(nextData);

    if (failedSections.length === requests.length) {
      setError(
        "Unable to load administrator information. Check your backend and login session."
      );
    } else if (failedSections.length > 0) {
      setError(
        `Some modules could not be loaded: ${failedSections.join(
          ", "
        )}. Their backend endpoints may not be available yet.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // -----------------------------------------------------
  // ACTIVATE / DEACTIVATE USER ACCOUNT
  // -----------------------------------------------------

  const handleUserStatusToggle = async (account) => {
    if (!account?.id) return;

    const nextStatus = account.is_active === false;
    const actionKey = `user-${account.id}`;

    setBusyAction(actionKey);
    setActionMessage("");
    setActionError("");

    try {
      await api.put(`/admin/users/${account.id}/status`, {
        is_active: nextStatus,
      });

      const roleKey =
        account.role === "trainee"
          ? "trainees"
          : account.role === "trainer"
            ? "trainers"
            : "recruiters";

      setData((previous) => ({
        ...previous,
        [roleKey]: previous[roleKey].map((item) =>
          item.id === account.id
            ? {
                ...item,
                is_active: nextStatus,
                status: nextStatus ? "Active" : "Inactive",
              }
            : item
        ),
      }));

      setActionMessage(
        `${account.full_name || account.name || "User"} account ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (err) {
      console.error("Account status update failed:", err);

      setActionError(
        err.response?.data?.message ||
          "Unable to update account status. Check that the admin PUT API is added to the backend."
      );
    } finally {
      setBusyAction("");
    }
  };

  // -----------------------------------------------------
  // UPDATE COURSE STATUS
  // -----------------------------------------------------

  const handleCourseStatusChange = async (courseId, nextStatus) => {
    if (!courseId || !nextStatus) return;

    const actionKey = `course-${courseId}`;

    setBusyAction(actionKey);
    setActionMessage("");
    setActionError("");

    try {
      await api.put(`/admin/courses/${courseId}/status`, {
        status: nextStatus,
      });

      const updateCourse = (items) =>
        items.map((item) =>
          item.id === courseId
            ? { ...item, status: nextStatus }
            : item
        );

      setData((previous) => ({
        ...previous,
        courses: updateCourse(previous.courses),
        programmes: updateCourse(previous.programmes),
      }));

      setActionMessage("Course status updated successfully.");
    } catch (err) {
      console.error("Course status update failed:", err);

      setActionError(
        err.response?.data?.message ||
          "Unable to update course status. Check that the admin PUT API is added to the backend."
      );
    } finally {
      setBusyAction("");
    }
  };

  // -----------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // -----------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------

  const handleMenuClick = (name) => {
    setActivePage(name);
    setSidebarOpen(false);
    setSearchTerm("");
    setActionMessage("");
    setActionError("");
  };

  // -----------------------------------------------------
  // DASHBOARD STATISTICS
  // -----------------------------------------------------

  const stats = useMemo(() => {
    const serverStats = data.stats || {};

    const activeProgrammes = data.programmes.filter(
      (item) =>
        String(item.status || "").toLowerCase() === "ongoing" ||
        String(item.status || "").toLowerCase() === "active"
    ).length;

    return [
      {
        title: "Total Trainees",
        value:
          serverStats.total_trainees ?? data.trainees.length,
        icon: Users,
        color: "blue",
      },
      {
        title: "Active Programmes",
        value:
          serverStats.active_programmes ?? activeProgrammes,
        icon: GraduationCap,
        color: "purple",
      },
      {
        title: "Total Courses",
        value:
          serverStats.total_courses ?? data.courses.length,
        icon: BookOpen,
        color: "green",
      },
      {
        title: "Certificates Issued",
        value:
          serverStats.total_certificates ??
          data.certificates.length,
        icon: Award,
        color: "orange",
      },
    ];
  }, [data]);

  const colors = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
  };

  const totalRecruiters =
    data.stats.total_recruiters ?? data.recruiters.length;

  const totalTrainers =
    data.stats.total_trainers ?? data.trainers.length;

  const totalJobs =
    data.stats.total_jobs ?? data.jobs.length;

  const totalApplications =
    data.stats.total_applications ?? data.applications.length;

  const completedPercentage = Math.min(
    100,
    Math.max(
      0,
      Number(data.trainingProgress.completed || 0)
    )
  );

  const inProgressPercentage = Math.min(
    100,
    Math.max(
      0,
      Number(data.trainingProgress.in_progress || 0)
    )
  );

  // -----------------------------------------------------
  // SEARCH FILTER
  // -----------------------------------------------------

  const filterRows = (rows) => {
    if (!searchTerm.trim()) return rows;

    const term = searchTerm.toLowerCase();

    return rows.filter((item) =>
      Object.values(item).some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  };

  // -----------------------------------------------------
  // REUSABLE TABLE
  // -----------------------------------------------------

  const DataTable = ({
    columns,
    rows,
    emptyMessage = "No records found.",
    rowKey = "id",
  }) => {
    const filteredRows = filterRows(rows);

    if (filteredRows.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText
            className="mx-auto mb-3 text-slate-400"
            size={36}
          />

          <p className="text-sm text-slate-500">
            {searchTerm
              ? "No matching records found."
              : emptyMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-4 font-semibold"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((item, index) => (
                <tr
                  key={item[rowKey] ?? item.id ?? index}
                  className="hover:bg-slate-50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 text-sm text-slate-600"
                    >
                      {column.render
                        ? column.render(item)
                        : item[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------
  // REUSABLE PAGE HEADING
  // -----------------------------------------------------

  const PageHeading = ({ title, description }) => (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-slate-500">{description}</p>
    </div>
  );

  // -----------------------------------------------------
  // REUSABLE ACCOUNT STATUS BADGE
  // -----------------------------------------------------

  const AccountStatus = ({ active }) => (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active === false
          ? "bg-red-50 text-red-700"
          : "bg-green-50 text-green-700"
      }`}
    >
      {active === false ? "Inactive" : "Active"}
    </span>
  );

  // -----------------------------------------------------
  // REUSABLE ACCOUNT ACTION BUTTON
  // -----------------------------------------------------

  const AccountAction = ({ item }) => (
    <button
      type="button"
      onClick={() => handleUserStatusToggle(item)}
      disabled={busyAction === `user-${item.id}`}
      className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        item.is_active === false
          ? "bg-green-50 text-green-700 hover:bg-green-100"
          : "bg-red-50 text-red-700 hover:bg-red-100"
      }`}
    >
      {busyAction === `user-${item.id}`
        ? "Updating..."
        : item.is_active === false
          ? "Activate"
          : "Deactivate"}
    </button>
  );

  // -----------------------------------------------------
  // DASHBOARD OVERVIEW
  // -----------------------------------------------------

  const renderDashboard = () => (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.full_name || "Admin"}!
          </h2>

          <p className="mt-1 text-slate-500">
            Here's what's happening across your training ecosystem.
          </p>
        </div>

        <button
          onClick={() => handleMenuClick("Programmes")}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-800"
        >
          <Plus size={19} />
          View Programmes
        </button>
      </div>

      {/* Main statistics */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {stat.title}
                  </p>

                  <h3 className="mt-3 text-3xl font-bold text-slate-900">
                    {formatNumber(stat.value)}
                  </h3>
                </div>

                <div className={`rounded-xl p-3 ${colors[stat.color]}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary statistics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Trainers",
            value: totalTrainers,
            icon: GraduationCap,
          },
          {
            title: "Total Recruiters",
            value: totalRecruiters,
            icon: UserCheck,
          },
          {
            title: "Job Posts",
            value: totalJobs,
            icon: Briefcase,
          },
          {
            title: "Job Applications",
            value: totalApplications,
            icon: FileText,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Icon size={22} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(item.value)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enrollment and progress */}
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              Training Enrollment
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Monthly trainee registrations
            </p>
          </div>

          {data.monthlyEnrollments.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">
              Monthly enrollment data is not available yet.
            </div>
          ) : (
            <div className="flex h-52 items-end justify-between gap-3 pt-5">
              {data.monthlyEnrollments.map((item, index) => {
                const value = Number(item.count || 0);

                const maximum = Math.max(
                  1,
                  ...data.monthlyEnrollments.map((entry) =>
                    Number(entry.count || 0)
                  )
                );

                const height = Math.max(
                  4,
                  (value / maximum) * 100
                );

                return (
                  <div
                    key={item.month || index}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full max-w-10 rounded-t-lg bg-blue-600 transition hover:bg-blue-800"
                      style={{ height: `${height}%` }}
                      title={`${item.month}: ${value} registrations`}
                    />

                    <span className="text-xs text-slate-400">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Training progress */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Training Progress
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Overall programme completion
          </p>

          <div className="flex justify-center py-8">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#2563eb 0% ${completedPercentage}%, #f97316 ${completedPercentage}% ${Math.min(
                  100,
                  completedPercentage + inProgressPercentage
                )}%, #e2e8f0 ${Math.min(
                  100,
                  completedPercentage + inProgressPercentage
                )}% 100%)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-bold text-slate-900">
                  {completedPercentage}%
                </span>

                <span className="text-xs text-slate-500">
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Completed</span>
              <span className="font-semibold">
                {completedPercentage}%
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${completedPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">In Progress</span>
              <span className="font-semibold">
                {inProgressPercentage}%
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-orange-500"
                style={{ width: `${inProgressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent programmes */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Recent Training Programmes
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Overview of active and upcoming programmes
            </p>
          </div>

          <button
            onClick={() => handleMenuClick("Programmes")}
            className="flex items-center gap-1 text-sm font-semibold text-blue-700"
          >
            View All <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Programme</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4">Enrollment</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.programmes.slice(0, 5).map((programme) => (
                <tr
                  key={programme.id || programme.name}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                    {programme.name || programme.title}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {programme.institution || "—"}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700">
                    {programme.enrolled ?? "—"}
                    {programme.capacity != null
                      ? ` / ${programme.capacity}`
                      : ""}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {programme.status || "Available"}
                    </span>
                  </td>
                </tr>
              ))}

              {data.programmes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-400"
                  >
                    No programme records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent trainees */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Recent Trainee Registrations
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Latest registered trainee accounts
            </p>
          </div>

          <button
            onClick={() => handleMenuClick("Trainees")}
            className="text-sm font-semibold text-blue-700"
          >
            View All
          </button>
        </div>

        <DataTable
          rows={[...data.trainees]
            .sort(
              (a, b) =>
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
            )
            .slice(0, 5)}
          columns={[
            {
              key: "full_name",
              label: "Trainee",
              render: (item) => (
                <div>
                  <p className="font-semibold text-slate-800">
                    {item.full_name || item.name || "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.email || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
            },
            {
              key: "created_at",
              label: "Registered",
              render: (item) => formatDate(item.created_at),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => (
                <AccountStatus active={item.is_active} />
              ),
            },
          ]}
        />
      </div>
    </>
  );

  // -----------------------------------------------------
  // TRAINEES
  // -----------------------------------------------------

  const renderTrainees = () => (
    <section>
      <PageHeading
        title="Trainee Management"
        description="View registered trainees and manage their accounts."
      />

      <DataTable
        rows={data.trainees}
        emptyMessage="No trainees registered yet."
        columns={[
          {
            key: "full_name",
            label: "Name",
            render: (item) => item.full_name || item.name || "—",
          },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          {
            key: "created_at",
            label: "Registered On",
            render: (item) => formatDate(item.created_at),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => (
              <AccountStatus active={item.is_active} />
            ),
          },
          {
            key: "actions",
            label: "Action",
            render: (item) => <AccountAction item={item} />,
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // TRAINERS
  // -----------------------------------------------------

  const renderTrainers = () => (
    <section>
      <PageHeading
        title="Trainer Management"
        description="View trainers and manage their accounts."
      />

      <DataTable
        rows={data.trainers}
        emptyMessage="No trainers available."
        columns={[
          {
            key: "full_name",
            label: "Trainer",
            render: (item) => item.full_name || item.name || "—",
          },
          { key: "email", label: "Email" },
          {
            key: "institution",
            label: "Institution",
            render: (item) => item.institution || "—",
          },
          {
            key: "created_at",
            label: "Registered",
            render: (item) => formatDate(item.created_at),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => (
              <AccountStatus active={item.is_active} />
            ),
          },
          {
            key: "actions",
            label: "Action",
            render: (item) => <AccountAction item={item} />,
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // RECRUITERS
  // -----------------------------------------------------

  const renderRecruiters = () => (
    <section>
      <PageHeading
        title="Recruiter Management"
        description="View recruiter accounts and company information."
      />

      <DataTable
        rows={data.recruiters}
        emptyMessage="No recruiters registered yet."
        columns={[
          {
            key: "full_name",
            label: "Recruiter",
            render: (item) => item.full_name || item.name || "—",
          },
          { key: "email", label: "Email" },
          {
            key: "company",
            label: "Company",
            render: (item) => item.company || item.company_name || "—",
          },
          {
            key: "created_at",
            label: "Registered",
            render: (item) => formatDate(item.created_at),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => (
              <AccountStatus active={item.is_active} />
            ),
          },
          {
            key: "actions",
            label: "Action",
            render: (item) => <AccountAction item={item} />,
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // INSTITUTIONS
  // -----------------------------------------------------

  const renderInstitutions = () => (
    <section>
      <PageHeading
        title="Institution Management"
        description="View institutions participating in the NCCT ecosystem."
      />

      <DataTable
        rows={data.institutions}
        emptyMessage="No institutions available."
        columns={[
          {
            key: "name",
            label: "Institution",
            render: (item) =>
              item.name || item.institution_name || "—",
          },
          { key: "email", label: "Email" },
          { key: "district", label: "District" },
          { key: "state", label: "State" },
          {
            key: "trainee_count",
            label: "Trainees",
            render: (item) =>
              item.trainee_count ?? item.trainees ?? "—",
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // PROGRAMMES
  // -----------------------------------------------------

  const renderProgrammes = () => (
    <section>
      <PageHeading
        title="Training Programmes"
        description="Monitor training programmes and enrollment."
      />

      <DataTable
        rows={data.programmes}
        emptyMessage="No training programmes available."
        columns={[
          {
            key: "name",
            label: "Programme",
            render: (item) => item.name || item.title || "—",
          },
          {
            key: "institution",
            label: "Institution",
            render: (item) => item.institution || "—",
          },
          {
            key: "trainees",
            label: "Enrolled",
            render: (item) => item.trainees ?? item.enrolled ?? "—",
          },
          {
            key: "duration",
            label: "Duration",
          },
          {
            key: "status",
            label: "Status",
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // COURSES AND LMS
  // -----------------------------------------------------

  const renderCourses = () => (
    <section>
      <PageHeading
        title="Courses & LMS"
        description="View available courses and manage their status."
      />

      <DataTable
        rows={data.courses}
        emptyMessage="No courses available."
        columns={[
          {
            key: "title",
            label: "Course",
          },
          {
            key: "category",
            label: "Category",
          },
          {
            key: "trainer_name",
            label: "Trainer",
          },
          {
            key: "duration",
            label: "Duration",
          },
          {
            key: "status",
            label: "Status",
            render: (item) => (
              <select
                value={item.status || "Ongoing"}
                onChange={(event) =>
                  handleCourseStatusChange(
                    item.id,
                    event.target.value
                  )
                }
                disabled={busyAction === `course-${item.id}`}
                className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            ),
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // ATTENDANCE
  // -----------------------------------------------------

  const renderAttendance = () => (
    <section>
      <PageHeading
        title="Attendance Management"
        description="Monitor trainee attendance records."
      />

      <DataTable
        rows={data.attendance}
        emptyMessage="No attendance records available."
        columns={[
          {
            key: "trainee_name",
            label: "Trainee",
          },
          {
            key: "course_title",
            label: "Course",
          },
          {
            key: "trainer_name",
            label: "Trainer",
          },
          {
            key: "date",
            label: "Date",
            render: (item) => formatDate(item.date),
          },
          {
            key: "status",
            label: "Attendance Status",
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // CERTIFICATES
  // -----------------------------------------------------

  const renderCertificates = () => (
    <section>
      <PageHeading
        title="Certificate Management"
        description="Monitor certificates issued to trainees."
      />

      <DataTable
        rows={data.certificates}
        emptyMessage="No certificates issued yet."
        columns={[
          {
            key: "certificate_number",
            label: "Certificate Number",
          },
          {
            key: "trainee_name",
            label: "Trainee",
          },
          {
            key: "course_title",
            label: "Course",
          },
          {
            key: "issued_by",
            label: "Issued By",
          },
          {
            key: "issued_at",
            label: "Issued On",
            render: (item) => formatDate(item.issued_at),
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // EMPLOYMENT
  // -----------------------------------------------------

  const renderEmployment = () => (
    <section>
      <PageHeading
        title="Employment Management"
        description="Monitor recruiter job postings and applications."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Job Posts</p>

          <h3 className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(totalJobs)}
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Applications</p>

          <h3 className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(totalApplications)}
          </h3>
        </div>
      </div>

      <h3 className="mb-4 text-lg font-bold text-slate-900">
        Job Postings
      </h3>

      <DataTable
        rows={data.jobs}
        emptyMessage="No job postings available."
        columns={[
          { key: "title", label: "Job Title" },
          { key: "company", label: "Company" },
          { key: "location", label: "Location" },
          { key: "job_type", label: "Job Type" },
          { key: "status", label: "Status" },
          {
            key: "application_count",
            label: "Applications",
          },
          {
            key: "deadline",
            label: "Deadline",
            render: (item) => formatDate(item.deadline),
          },
        ]}
      />

      <h3 className="mb-4 mt-8 text-lg font-bold text-slate-900">
        Job Applications
      </h3>

      <DataTable
        rows={data.applications}
        emptyMessage="No job applications available."
        columns={[
          {
            key: "trainee_name",
            label: "Trainee",
          },
          {
            key: "job_title",
            label: "Job",
          },
          {
            key: "company",
            label: "Company",
          },
          {
            key: "recruiter_name",
            label: "Recruiter",
          },
          {
            key: "status",
            label: "Application Status",
          },
          {
            key: "applied_at",
            label: "Applied On",
            render: (item) => formatDate(item.applied_at),
          },
        ]}
      />
    </section>
  );

  // -----------------------------------------------------
  // ANALYTICS
  // -----------------------------------------------------

  const renderAnalytics = () => (
    <section>
      <PageHeading
        title="Platform Analytics"
        description="Overview of the current training and employment ecosystem."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Trainees",
            value: data.trainees.length,
            icon: Users,
          },
          {
            title: "Trainers",
            value: data.trainers.length,
            icon: GraduationCap,
          },
          {
            title: "Recruiters",
            value: data.recruiters.length,
            icon: UserCheck,
          },
          {
            title: "Courses",
            value: data.courses.length,
            icon: BookOpen,
          },
          {
            title: "Certificates",
            value: data.certificates.length,
            icon: Award,
          },
          {
            title: "Job Applications",
            value: data.applications.length,
            icon: Briefcase,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {item.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatNumber(item.value)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  // -----------------------------------------------------
  // SETTINGS
  // -----------------------------------------------------

  const renderSettings = () => (
    <section>
      <PageHeading
        title="Administrator Settings"
        description="Current administrator account information."
      />

      <div className="max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              {user?.full_name || "Administrator"}
            </h3>

            <p className="text-sm text-slate-500">
              {user?.email || "Administrator account"}
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs text-slate-500">Full Name</p>

            <p className="mt-1 font-medium text-slate-800">
              {user?.full_name || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Email Address</p>

            <p className="mt-1 font-medium text-slate-800">
              {user?.email || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Role</p>

            <p className="mt-1 font-medium capitalize text-slate-800">
              {user?.role || "Administrator"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </section>
  );

  // -----------------------------------------------------
  // RENDER SELECTED MODULE
  // -----------------------------------------------------

  const renderContent = () => {
    switch (activePage) {
      case "Institutions":
        return renderInstitutions();

      case "Trainees":
        return renderTrainees();

      case "Trainers":
        return renderTrainers();

      case "Recruiters":
        return renderRecruiters();

      case "Programmes":
        return renderProgrammes();

      case "Courses & LMS":
        return renderCourses();

      case "Attendance":
        return renderAttendance();

      case "Certificates":
        return renderCertificates();

      case "Employment":
        return renderEmployment();

      case "Analytics":
        return renderAnalytics();

      case "Settings":
        return renderSettings();

      default:
        return renderDashboard();
    }
  };

  // -----------------------------------------------------
  // MAIN JSX
  // -----------------------------------------------------

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-blue-950 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-700 p-2">
              <GraduationCap size={27} />
            </div>

            <div>
              <h1 className="text-lg font-bold">NCCT Portal</h1>

              <p className="text-xs text-blue-300">
                Admin Workspace
              </p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-blue-300">
            Main Menu
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item.name)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                    active
                      ? "bg-blue-700 text-white shadow-lg"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin profile */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 font-bold">
              {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.full_name || "Administrator"}
              </p>

              <p className="text-xs text-blue-300">
                System Administrator
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="text-blue-300 hover:text-white"
            >
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Top navbar */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={25} />
            </button>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {activePage}
              </h2>

              <p className="hidden text-xs text-slate-500 sm:block">
                NCCT Training Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center rounded-xl bg-slate-100 px-3 py-2 md:flex">
              <Search size={17} className="text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search..."
                className="w-36 bg-transparent px-2 text-sm outline-none"
              />
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh dashboard"
              className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={19}
                className={`text-slate-600 ${
                  loading ? "animate-spin" : ""
                }`}
              />
            </button>

            <button
              title="Notifications"
              className="relative rounded-xl p-2 hover:bg-slate-100"
            >
              <Bell size={21} className="text-slate-600" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="p-5 lg:p-8">
          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {actionMessage && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{actionMessage}</span>
            </div>
          )}

          {actionError && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{actionError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="animate-spin" size={22} />
              Loading administrator information...
            </div>
          ) : (
            renderContent()
          )}

          <footer className="mt-8 text-center text-xs text-slate-400">
            © 2026 NCCT Digital Ecosystem. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;