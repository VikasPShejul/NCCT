
import React, { useCallback, useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  Menu,
  X,
  Clock,
  User,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BriefcaseBusiness,
  FileText,
  MapPin,
  IndianRupee,
  Award,
  Search,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function TraineeDashboard() {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const { user, logout } = useAuth();

  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingJobId, setApplyingJobId] = useState(null);

  const [stats, setStats] = useState({
    total_courses: 0,
    completed_courses: 0,
    attendance_percentage: 0,
    total_assessments: 0,
  });

  const [courses, setCourses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    present: 0,
    percentage: 0,
  });
  // Course catalogue and enrollment
const [catalogCourses, setCatalogCourses] = useState([]);
const [catalogCategories, setCatalogCategories] = useState([]);
const [courseSearch, setCourseSearch] = useState("");
const [courseCategory, setCourseCategory] = useState("all");
const [catalogLoading, setCatalogLoading] = useState(false);
const [enrollingCourseId, setEnrollingCourseId] = useState(null);
const [courseMessage, setCourseMessage] = useState("");
  const [assessments, setAssessments] = useState([]);

  // Employment data
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);

  // Certificate data
  const [certificates, setCertificates] = useState([]);

  // Study materials state
  const [materialCourseId, setMaterialCourseId] = useState("");
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [downloadingMaterialId, setDownloadingMaterialId] = useState(null);

  // Load all trainee dashboard information
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      api.get("/trainee/dashboard"),
      api.get("/trainee/courses"),
      api.get("/trainee/attendance"),
      api.get("/trainee/assessments"),
      api.get("/trainee/jobs"),
      api.get("/trainee/applications"),
      api.get("/trainee/certificates"),
    ]);

    const [
      dashboardResult,
      coursesResult,
      attendanceResult,
      assessmentsResult,
      jobsResult,
      applicationsResult,
      certificatesResult,
    ] = results;

    const failedSections = [];

    if (dashboardResult.status === "fulfilled") {
      setStats(
        dashboardResult.value.data.stats || {
          total_courses: 0,
          completed_courses: 0,
          attendance_percentage: 0,
          total_assessments: 0,
        }
      );
    } else {
      failedSections.push("dashboard");
    }

    if (coursesResult.status === "fulfilled") {
      setCourses(coursesResult.value.data.courses || []);
    } else {
      failedSections.push("courses");
    }

    if (attendanceResult.status === "fulfilled") {
      setAttendance(
        attendanceResult.value.data.attendance || []
      );

      setAttendanceSummary(
        attendanceResult.value.data.summary || {
          total: 0,
          present: 0,
          percentage: 0,
        }
      );
    } else {
      failedSections.push("attendance");
    }

    if (assessmentsResult.status === "fulfilled") {
      setAssessments(
        assessmentsResult.value.data.assessments || []
      );
    } else {
      failedSections.push("assessments");
    }

    if (jobsResult.status === "fulfilled") {
      setJobs(jobsResult.value.data.jobs || []);
    } else {
      failedSections.push("employment");
    }

    if (applicationsResult.status === "fulfilled") {
      setApplications(
        applicationsResult.value.data.applications || []
      );
    } else {
      failedSections.push("applications");
    }

    if (certificatesResult.status === "fulfilled") {
      setCertificates(
        certificatesResult.value.data.certificates || []
      );
    } else {
      failedSections.push("certificates");
    }

    if (failedSections.length === results.length) {
      setError(
        "Unable to connect to the server. Please check your backend and login session."
      );
    } else if (failedSections.length > 0) {
      setError(
        `Some information could not be loaded: ${failedSections.join(
          ", "
        )}. Check whether the corresponding backend APIs are available.`
      );
    }

    setLoading(false);
  }, []);
  // Load available courses with search and category filters
const loadCourseCatalog = useCallback(async () => {
  try {
    setCatalogLoading(true);

    const response = await api.get("/trainee/courses/catalog", {
      params: {
        search: courseSearch,
        category: courseCategory,
      },
    });

    setCatalogCourses(response.data.courses || []);
    setCatalogCategories(response.data.categories || []);
  } catch (err) {
    console.error("Course catalogue error:", err);

    setCourseMessage(
      err.response?.data?.message ||
      "Unable to load available courses."
    );
  } finally {
    setCatalogLoading(false);
  }
}, [courseSearch, courseCategory]);

// Load catalogue whenever Explore Courses is opened
// or the search/category selection changes
useEffect(() => {
  if (activePage === "Explore Courses") {
    loadCourseCatalog();
  }
}, [activePage, loadCourseCatalog]);

// Enroll trainee in selected course
const handleCourseEnrollment = async (courseId) => {
  try {
    setEnrollingCourseId(courseId);
    setCourseMessage("");

    const response = await api.post(
      `/trainee/courses/${courseId}/enroll`,
      {}
    );

    setCourseMessage(
      response.data.message || "Successfully enrolled!"
    );

    // Refresh enrolled courses, dashboard statistics and catalogue
    await Promise.all([
      loadDashboard(),
      loadCourseCatalog(),
    ]);
  } catch (err) {
    setCourseMessage(
      err.response?.data?.message ||
      "Unable to enroll in this course."
    );
  } finally {
    setEnrollingCourseId(null);
  }
};


  // Load study materials for one of the trainee's enrolled courses.
  const loadCourseMaterials = useCallback(async (courseId) => {
    if (!courseId) {
      setCourseMaterials([]);
      setMaterialsError("");
      setMaterialsLoading(false);
      return;
    }

    try {
      setMaterialsLoading(true);
      setMaterialsError("");

      const response = await api.get(
        `/trainee/courses/${courseId}/materials`
      );

      setCourseMaterials(response.data.materials || []);
    } catch (err) {
      console.error("Trainee study materials loading error:", err);
      setCourseMaterials([]);
      setMaterialsError(
        err.response?.data?.message ||
          "Unable to load study materials for this course."
      );
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  // Select the first enrolled course automatically when this page opens.
  useEffect(() => {
    if (activePage !== "Study Materials") return;

    if (!courses.length) {
      setMaterialCourseId("");
      setCourseMaterials([]);
      setMaterialsError("");
      return;
    }

    if (!materialCourseId) {
      setMaterialCourseId(String(courses[0].course_id));
    }
  }, [activePage, courses, materialCourseId]);

  useEffect(() => {
    if (activePage === "Study Materials" && materialCourseId) {
      loadCourseMaterials(materialCourseId);
    }
  }, [activePage, materialCourseId, loadCourseMaterials]);

  // Download through the authenticated API so the backend can verify
  // the trainee's enrollment before returning the uploaded file.
  const handleMaterialDownload = async (material) => {
    try {
      setDownloadingMaterialId(material.id);

      const response = await api.get(
        `/trainee/materials/${material.id}/download`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/octet-stream"
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = material.file_name || "study-material";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Study material download error:", err);

      // Axios returns a Blob for error responses when responseType is blob.
      let message = "Unable to download this study material.";
      const errorData = err.response?.data;

      if (errorData instanceof Blob) {
        try {
          const parsed = JSON.parse(await errorData.text());
          message = parsed.message || message;
        } catch {
          // Keep the fallback message.
        }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }

      setMaterialsError(message);
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (activePage !== "Attendance" || !qrScannerOpen) {
      return;
    }

    let scanner;
    let scanCompleted = false;

    const startScanner = () => {
      scanner = new Html5QrcodeScanner(
        "qr-attendance-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          if (scanCompleted) return;

          scanCompleted = true;

          try {
            await scanner.clear();
            setQrScannerOpen(false);
            setScanMessage("QR scanned. Verifying attendance...");
            setScanStatus("info");

            const response = await api.post(
              "/trainee/attendance/scan",
              { token: decodedText }
            );

            setScanMessage(
              response.data.message ||
              "Attendance marked successfully!"
            );
            setScanStatus("success");

            await loadDashboard();
          } catch (err) {
            setScanMessage(
              err.response?.data?.message ||
              "Unable to mark attendance. Please try again."
            );
            setScanStatus("error");
          }
        },
        () => {
          // Ignore continuous camera scan errors.
        }
      );
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [activePage, qrScannerOpen, loadDashboard]);

  // Logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Apply for a job
  const applyForJob = async (jobId) => {
    try {
      setApplyingJobId(jobId);

      await api.post(`/trainee/jobs/${jobId}/apply`, {});

      window.alert("Your job application was submitted successfully!");

      await loadDashboard();
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
          "Unable to submit your application. Please try again."
      );
    } finally {
      setApplyingJobId(null);
    }
  };

  // Open certificate verification page
  const verifyCertificate = (certificateNumber) => {
    window.open(
      `/verify-certificate/${encodeURIComponent(certificateNumber)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // Sidebar menu
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "My Courses", icon: BookOpen },
    { name: "Study Materials", icon: FileText },
    { name: "Explore Courses", icon: Search },
    { name: "Attendance", icon: CalendarDays },
    { name: "Assessments", icon: ClipboardCheck },
    { name: "Employment", icon: BriefcaseBusiness },
    { name: "My Applications", icon: FileText },
    { name: "Certificates", icon: Award },
  ];

  // Reusable statistic card
  const StatCard = ({ title, value, subtitle, icon: Icon }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );

  // Reusable empty state
  const EmptyState = ({ message }) => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <BookOpen
        className="mx-auto mb-3 text-slate-400"
        size={35}
      />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );

  // Dashboard overview
  const renderDashboard = () => (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome, {user?.full_name || "Trainee"}!
        </h2>
        <p className="mt-1 text-slate-500">
          Here is your training progress and learning activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Enrolled Courses"
          value={stats.total_courses ?? 0}
          subtitle="Your active learning"
          icon={BookOpen}
        />

        <StatCard
          title="Completed Courses"
          value={stats.completed_courses ?? 0}
          subtitle="Courses marked completed"
          icon={GraduationCap}
        />

        <StatCard
          title="Attendance"
          value={`${stats.attendance_percentage ?? 0}%`}
          subtitle="Present attendance records"
          icon={TrendingUp}
        />

        <StatCard
          title="Assessments"
          value={stats.total_assessments ?? 0}
          subtitle="Assigned assessments"
          icon={ClipboardCheck}
        />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* My Courses */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              My Courses
            </h3>

            <button
              onClick={() => setActivePage("My Courses")}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              View all
            </button>
          </div>

          {courses.length === 0 ? (
            <EmptyState message="You have not enrolled in any courses yet." />
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 4).map((course) => (
                <div
                  key={course.course_id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {course.title}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        Trainer: {course.trainer_name || "Not assigned"}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                      {course.enrollment_status || "Enrolled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Assessments */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Recent Assessments
            </h3>

            <button
              onClick={() => setActivePage("Assessments")}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              View all
            </button>
          </div>

          {assessments.length === 0 ? (
            <EmptyState message="No assessments have been assigned yet." />
          ) : (
            <div className="space-y-3">
              {assessments.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {item.title}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.course_title}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    {item.result_status || "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Employment summary */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              Employment Opportunities
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Explore jobs and track your applications.
            </p>
          </div>

          <button
            onClick={() => setActivePage("Employment")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Explore Jobs
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Available Jobs</p>
            <h3 className="mt-2 text-2xl font-bold text-blue-900">
              {jobs.length}
            </h3>
          </div>

          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Applications</p>
            <h3 className="mt-2 text-2xl font-bold text-amber-900">
              {applications.length}
            </h3>
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-sm text-green-700">Shortlisted</p>
            <h3 className="mt-2 text-2xl font-bold text-green-900">
              {
                applications.filter(
                  (item) => item.status === "Shortlisted"
                ).length
              }
            </h3>
          </div>
        </div>
      </section>

      {/* Certificates summary */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              My Certificates
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              View and verify your course completion certificates.
            </p>
          </div>

          <button
            onClick={() => setActivePage("Certificates")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View Certificates
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl bg-amber-50 p-4">
          <div className="rounded-xl bg-white p-3 text-amber-600">
            <Award size={28} />
          </div>

          <div>
            <p className="text-sm text-amber-800">
              Certificates Issued
            </p>
            <h3 className="text-2xl font-bold text-amber-900">
              {certificates.length}
            </h3>
          </div>
        </div>
      </section>
    </>
  );

  // My Courses page
  const renderCourses = () => (
    <section>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        My Courses
      </h2>

      <p className="mb-6 text-slate-500">
        Training programmes in which you are enrolled.
      </p>

      {courses.length === 0 ? (
        <EmptyState message="You are not enrolled in any courses yet. Contact your training administrator." />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.course_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                  <BookOpen size={23} />
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                  {course.enrollment_status || "Enrolled"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {course.title}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {course.category || "General Training"}
              </p>

              <p className="mt-3 text-sm text-slate-600">
                {course.description || "No course description available."}
              </p>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <User size={16} />
                  {course.trainer_name || "Trainer not assigned"}
                </p>

                <p className="flex items-center gap-2">
                  <Clock size={16} />
                  {course.duration || "Duration not specified"}
                </p>

                <p className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  {course.mode || "Mode not specified"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

// Explore available courses
const renderExploreCourses = () => (
  <section>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">
        Explore Courses
      </h2>
      <p className="mt-1 text-slate-500">
        Discover training programmes and enroll in courses.
      </p>
    </div>

    {/* Search and category filters */}
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="relative md:col-span-2">
        <Search
          size={19}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search by course name, category or description..."
          value={courseSearch}
          onChange={(e) => setCourseSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-blue-500"
        />
      </div>

      <select
        value={courseCategory}
        onChange={(e) => setCourseCategory(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      >
        <option value="all">All Categories</option>

        {catalogCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>

    {/* Enrollment feedback */}
    {courseMessage && (
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        {courseMessage}
      </div>
    )}

    {/* Course catalogue */}
    {catalogLoading ? (
      <div className="rounded-xl bg-white p-10 text-center text-slate-500">
        Loading available courses...
      </div>
    ) : catalogCourses.length === 0 ? (
      <EmptyState message="No courses found. Try another search or category." />
    ) : (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {catalogCourses.map((course) => (
          <div
            key={course.course_id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <BookOpen size={24} />
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                {course.course_status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {course.title}
            </h3>

            <p className="mt-1 text-sm font-medium text-blue-700">
              {course.category || "General Training"}
            </p>

            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {course.description || "No description available."}
            </p>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <User size={16} />
                {course.trainer_name || "Trainer not assigned"}
              </p>

              <p className="flex items-center gap-2">
                <Clock size={16} />
                {course.duration || "Duration not specified"}
              </p>

              <p className="flex items-center gap-2">
                <GraduationCap size={16} />
                {course.mode || "Mode not specified"}
              </p>
            </div>

            {course.is_enrolled ? (
              <button
                disabled
                className="mt-5 w-full rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
              >
                <CheckCircle size={16} className="mr-2 inline" />
                Already Enrolled
              </button>
            ) : (
              <button
                onClick={() =>
                  handleCourseEnrollment(course.course_id)
                }
                disabled={enrollingCourseId !== null}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enrollingCourseId === course.course_id
                  ? "Enrolling..."
                  : "Enroll Now"}
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
);


  // Study Materials page
  const renderStudyMaterials = () => {
    const selectedCourse = courses.find(
      (course) => String(course.course_id) === String(materialCourseId)
    );

    return (
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Study Materials
          </h2>
          <p className="mt-1 text-slate-500">
            Access notes, presentations, books and other resources shared by your trainers.
          </p>
        </div>

        {courses.length === 0 ? (
          <EmptyState message="You are not enrolled in any courses yet. Enroll in a course to access its study materials." />
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label
                htmlFor="trainee-material-course"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Select Course
              </label>
              <select
                id="trainee-material-course"
                value={materialCourseId}
                onChange={(event) => {
                  setMaterialCourseId(event.target.value);
                  setCourseMaterials([]);
                  setMaterialsError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Choose an enrolled course</option>
                {courses.map((course) => (
                  <option
                    key={course.course_id}
                    value={String(course.course_id)}
                  >
                    {course.title}
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <p className="mt-2 text-xs text-slate-500">
                  Enrollment: {selectedCourse.enrollment_status || "Enrolled"}
                </p>
              )}
            </div>

            {materialsError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {materialsError}
              </div>
            )}

            {materialsLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                <RefreshCw className="mx-auto mb-3 animate-spin" size={22} />
                Loading study materials...
              </div>
            ) : !materialCourseId ? (
              <EmptyState message="Select a course to view its study materials." />
            ) : courseMaterials.length === 0 ? (
              <EmptyState message="Your trainer has not uploaded any study materials for this course yet." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {courseMaterials.map((material) => (
                  <article
                    key={material.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-slate-900">
                          {material.title}
                        </h3>
                        <p className="mt-1 text-xs capitalize text-blue-700">
                          {material.material_type || "resource"}
                        </p>
                      </div>
                    </div>

                    {material.description && (
                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {material.description}
                      </p>
                    )}

                    {material.file_name && (
                      <p className="mt-3 break-all text-xs text-slate-500">
                        File: {material.file_name}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                      {material.has_file && (
                        <button
                          type="button"
                          onClick={() => handleMaterialDownload(material)}
                          disabled={downloadingMaterialId === material.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadingMaterialId === material.id ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <FileText size={16} />
                              Download File
                            </>
                          )}
                        </button>
                      )}

                      {material.external_url && (
                        <a
                          href={material.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Open External Resource
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  // Attendance page
  const renderAttendance = () => (
    <section>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            My Attendance
          </h2>

          <p className="text-slate-500">
            Scan your trainer's QR code to mark attendance.
          </p>
        </div>

        <button
          onClick={() => {
            setScanMessage("");
            setScanStatus("");
            setQrScannerOpen((previous) => !previous);
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {qrScannerOpen ? "Close Scanner" : "Scan Attendance QR"}
        </button>
      </div>

      {scanMessage && (
        <div
          className={`mb-5 rounded-xl border p-4 text-sm ${
            scanStatus === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : scanStatus === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {scanMessage}
        </div>
      )}

      {qrScannerOpen && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 font-semibold text-slate-900">
            Scan Trainer QR Code
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            Allow camera access and position the QR code inside the scanning area.
          </p>

          <div
            id="qr-attendance-reader"
            className="mx-auto max-w-md overflow-hidden"
          />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Attendance"
          value={`${attendanceSummary.percentage ?? 0}%`}
          subtitle="Present percentage"
          icon={TrendingUp}
        />

        <StatCard
          title="Present"
          value={attendanceSummary.present ?? 0}
          subtitle="Present records"
          icon={CheckCircle}
        />

        <StatCard
          title="Total Records"
          value={attendanceSummary.total ?? 0}
          subtitle="Recorded attendance days"
          icon={CalendarDays}
        />
      </div>

      {attendance.length === 0 ? (
        <EmptyState message="No attendance records are available yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {attendance.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {item.course_title}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.date}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "Present"
                            ? "bg-green-50 text-green-700"
                            : item.status === "Late"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );

  // Assessments page
  const renderAssessments = () => (
    <section>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        My Assessments
      </h2>

      <p className="mb-6 text-slate-500">
        Check assigned assessments, marks, and trainer feedback.
      </p>

      {assessments.length === 0 ? (
        <EmptyState message="No assessments have been assigned to your courses." />
      ) : (
        <div className="space-y-4">
          {assessments.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-blue-700">
                    {item.course_title}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    {item.description || "No additional instructions."}
                  </p>
                </div>

                <div className="shrink-0">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.result_status === "Pass"
                        ? "bg-green-50 text-green-700"
                        : item.result_status === "Fail"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.result_status || "Pending"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {item.due_date || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Marks</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {item.marks_obtained == null
                      ? `Pending / ${item.total_marks ?? "—"}`
                      : `${item.marks_obtained} / ${item.total_marks}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Percentage</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {item.percentage == null
                      ? "Not evaluated"
                      : `${item.percentage}%`}
                  </p>
                </div>
              </div>

              {item.feedback && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-800">
                    Trainer Feedback
                  </p>

                  <p className="mt-1 text-sm text-blue-900">
                    {item.feedback}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // Employment page
  const renderEmployment = () => (
    <section>
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">
          Employment Opportunities
        </h2>

        <p className="text-slate-500">
          Explore job opportunities posted by recruiters.
        </p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState message="No open job opportunities are available right now." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {job.title}
                  </h3>

                  <p className="mt-1 text-sm font-medium text-blue-700">
                    {job.company}
                  </p>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                  {job.status || "Open"}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <MapPin size={16} />
                  {job.location || "Location not specified"}
                </p>

                <p className="flex items-center gap-2">
                  <BriefcaseBusiness size={16} />
                  {job.job_type || "Job type not specified"}
                </p>

                <p className="flex items-center gap-2">
                  <IndianRupee size={16} />
                  {job.salary_range || "Salary not specified"}
                </p>

                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  Deadline: {job.deadline || "Not specified"}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-sm leading-relaxed text-slate-600">
                  {job.description || "No job description available."}
                </p>

                {job.skills && (
                  <p className="mt-3 text-sm text-slate-600">
                    <strong>Required Skills:</strong> {job.skills}
                  </p>
                )}
              </div>

              <div className="mt-5">
                {job.already_applied ? (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
                    <CheckCircle size={17} />
                    Already Applied
                  </span>
                ) : (
                  <button
                    onClick={() => applyForJob(job.id)}
                    disabled={applyingJobId === job.id}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {applyingJobId === job.id
                      ? "Applying..."
                      : "Apply Now"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // My Applications page
  const renderApplications = () => (
    <section>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        My Applications
      </h2>

      <p className="mb-6 text-slate-500">
        Track the status of your job applications.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Applications"
          value={applications.length}
          subtitle="Jobs you applied for"
          icon={FileText}
        />

        <StatCard
          title="Shortlisted"
          value={
            applications.filter(
              (item) => item.status === "Shortlisted"
            ).length
          }
          subtitle="Applications shortlisted"
          icon={CheckCircle}
        />

        <StatCard
          title="Hired"
          value={
            applications.filter(
              (item) => item.status === "Hired"
            ).length
          }
          subtitle="Successful applications"
          icon={GraduationCap}
        />
      </div>

      {applications.length === 0 ? (
        <EmptyState message="You have not applied for any jobs yet. Visit Employment to explore opportunities." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Job Title
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Company
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Applied On
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>
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
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          application.status === "Hired"
                            ? "bg-green-50 text-green-700"
                            : application.status === "Shortlisted"
                            ? "bg-blue-50 text-blue-700"
                            : application.status === "Rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {application.status || "Applied"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );

  // Certificates page
  const renderCertificates = () => (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          My Certificates
        </h2>

        <p className="mt-1 text-slate-500">
          View certificates issued after successful course completion.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Certificates Issued"
          value={certificates.length}
          subtitle="Your earned certificates"
          icon={Award}
        />

        <StatCard
          title="Verified Certificate Records"
          value={certificates.length}
          subtitle="Certificates available for verification"
          icon={CheckCircle}
        />
      </div>

      {certificates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Award
            className="mx-auto mb-3 text-slate-400"
            size={40}
          />

          <h3 className="font-semibold text-slate-700">
            No certificates available
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Your certificates will appear here when issued by your trainer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {certificates.map((certificate) => (
            <div
              key={certificate.certificate_number}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                  <Award size={28} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Course Certificate
                  </h3>

                  <p className="flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle size={13} />
                    Issued
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Course
                  </p>

                  <p className="font-semibold text-slate-800">
                    {certificate.course_title || "Course"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Certificate Number
                  </p>

                  <p className="break-all font-semibold text-blue-700">
                    {certificate.certificate_number}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Issued On
                  </p>

                  <p className="font-medium text-slate-800">
                    {certificate.issued_at
                      ? new Date(
                          certificate.issued_at
                        ).toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  verifyCertificate(
                    certificate.certificate_number
                  )
                }
                className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Verify Certificate
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // Render selected page
  const renderContent = () => {
    switch (activePage) {
      case "My Courses":
        return renderCourses();
        
      case "Explore Courses":
        return renderExploreCourses();

      case "Study Materials":
        return renderStudyMaterials();

      case "Attendance":
        return renderAttendance();

      case "Assessments":
        return renderAssessments();

      case "Employment":
        return renderEmployment();

      case "My Applications":
        return renderApplications();

      case "Certificates":
        return renderCertificates();

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close menu overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2">
              <GraduationCap size={24} />
            </div>

            <div>
              <h1 className="font-bold">NCCT Portal</h1>
              <p className="text-xs text-slate-400">
                Trainee Workspace
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

        {/* User information */}
        <div className="border-b border-slate-800 px-6 py-5">
          <p className="text-xs text-slate-400">
            SIGNED IN AS
          </p>

          <p className="mt-1 font-semibold">
            {user?.full_name || "Trainee"}
          </p>

          <p className="text-xs capitalize text-slate-400">
            {user?.role || "trainee"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Trainee Workspace
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={23} />
            </button>

            <div>
              <h2 className="font-bold text-slate-900">
                {activePage}
              </h2>

              <p className="hidden text-xs text-slate-500 sm:block">
                NCCT Training and Employment Ecosystem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {(user?.full_name || "T")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="p-4 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
              <RefreshCw
                className="animate-spin"
                size={22}
              />
              Loading your information...
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}
