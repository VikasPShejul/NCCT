
import React, { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Bell,
  Menu,
  X,
  LogOut,
  Settings,
  Search,
  Plus,
  Clock,
  MapPin,
  ChevronRight,
  FileText,
  TrendingUp,
  Save,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "My Courses", icon: BookOpen },
  { label: "Study Materials", icon: FileText },
  { label: "My Trainees", icon: Users },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "Assessments", icon: FileText },
  { label: "Schedule", icon: CalendarDays },
];

const today = () => {
  const current = new Date();
  const offset = current.getTimezoneOffset();
  return new Date(current.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

function TrainerDashboard() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Study materials state
  const [materialCourseId, setMaterialCourseId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialMessage, setMaterialMessage] = useState("");
  const [materialFile, setMaterialFile] = useState(null);

  const [materialForm, setMaterialForm] = useState({
    title: "",
    description: "",
    material_type: "notes",
    external_url: "",
  });

  const [statistics, setStatistics] = useState({
    active_courses: 0,
    total_trainees: 0,
    average_attendance: 0,
    completed_courses: 0,
  });

  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [trainees, setTrainees] = useState([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(today());

  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [qrToken, setQrToken] = useState("");
  const [qrExpiry, setQrExpiry] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    category: "",
    description: "",
    duration: "",
    mode: "Offline",
  });

  const [assessmentForm, setAssessmentForm] = useState({
    course_id: "",
    title: "",
    description: "",
    total_marks: "100",
    due_date: "",
  });

  const trainerName = user?.full_name || "Trainer";
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const [assessmentTrainees, setAssessmentTrainees] = useState([]);

  const [resultInputs, setResultInputs] = useState({});

  const [savedResults, setSavedResults] = useState({});

  const [savingResultId, setSavingResultId] = useState(null);
  // -------------------------------------------------
  // STUDY MATERIALS
  // -------------------------------------------------

  const loadCourseMaterials = useCallback(async (courseId) => {
    setMaterials([]);
    setMaterialMessage("");

    if (!courseId) {
      setMaterialsLoading(false);
      return;
    }

    try {
      setMaterialsLoading(true);

      const response = await api.get(
        `/trainer/courses/${courseId}/materials`
      );

      setMaterials(response.data.materials || []);
    } catch (err) {
      console.error("Study materials loading error:", err);
      setMaterialMessage(
        err.response?.data?.message ||
          "Unable to load study materials."
      );
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeMenu === "Study Materials") {
      loadCourseMaterials(materialCourseId);
    }
  }, [activeMenu, materialCourseId, loadCourseMaterials]);

  const handleMaterialUpload = async (event) => {
    event.preventDefault();
    setMaterialMessage("");

    if (!materialCourseId) {
      setMaterialMessage("Please select a course.");
      return;
    }

    if (!materialForm.title.trim()) {
      setMaterialMessage("Please enter a material title.");
      return;
    }

    if (!materialFile && !materialForm.external_url.trim()) {
      setMaterialMessage("Choose a file or enter a resource URL.");
      return;
    }

    if (materialFile && materialFile.size > 100 * 1024 * 1024) {
      setMaterialMessage("File size must not exceed 100 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("title", materialForm.title.trim());
    formData.append("description", materialForm.description.trim());
    formData.append("material_type", materialForm.material_type);
    formData.append("external_url", materialForm.external_url.trim());

    if (materialFile) {
      formData.append("file", materialFile);
    }

    try {
      setMaterialSaving(true);

      const response = await api.post(
        `/trainer/courses/${materialCourseId}/materials`,
        formData,
        {
          // Remove any global application/json header from the Axios instance.
          // The browser must set multipart/form-data with its boundary automatically.
          headers: {
            "Content-Type": undefined,
          },
          // Prevent a global/default Axios transform from JSON-stringifying FormData.
          transformRequest: [(data) => data],
        }
      );

      setMaterialForm({
        title: "",
        description: "",
        material_type: "notes",
        external_url: "",
      });
      setMaterialFile(null);

      const fileInput = document.getElementById("trainer-material-file");
      if (fileInput) fileInput.value = "";

      await loadCourseMaterials(materialCourseId);
      setMaterialMessage(
        response.data.message || "Study material added successfully."
      );
    } catch (err) {
      console.error("Study material upload error:", err);
      setMaterialMessage(
        err.response?.data?.message ||
          "Unable to upload study material."
      );
    } finally {
      setMaterialSaving(false);
    }
  };

  const handleMaterialDelete = async (materialId) => {
    if (!window.confirm("Delete this study material?")) return;

    try {
      setMaterialMessage("");
      await api.delete(`/trainer/materials/${materialId}`);
      await loadCourseMaterials(materialCourseId);
      setMaterialMessage("Study material deleted successfully.");
    } catch (err) {
      console.error("Study material deletion error:", err);
      setMaterialMessage(
        err.response?.data?.message ||
          "Unable to delete study material."
      );
    }
  };

  // -------------------------------------------------
  // LOAD DASHBOARD DATA
  // -------------------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, coursesResponse, assessmentResponse] =
        await Promise.all([
          api.get("/trainer/dashboard"),
          api.get("/trainer/courses"),
          api.get("/trainer/assessments"),
        ]);

      setStatistics(dashboardResponse.data.statistics);
      setCourses(coursesResponse.data.courses || []);
      setAssessments(assessmentResponse.data.assessments || []);
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load trainer dashboard. Please log in again if your session has expired."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // -------------------------------------------------
  // LOAD TRAINEES FOR SELECTED COURSE
  // -------------------------------------------------

  const loadTrainees = useCallback(async (courseId) => {
    if (!courseId) {
      setTrainees([]);
      setAttendanceRecords({});
      return;
    }

    setError("");

    try {
      const response = await api.get(
        `/trainer/courses/${courseId}/trainees`
      );

      const traineeList = response.data.trainees || [];

      setTrainees(traineeList);

      const initialRecords = {};

      traineeList.forEach((trainee) => {
        initialRecords[trainee.id] = "Present";
      });

      setAttendanceRecords(initialRecords);
    } catch (err) {
      console.error("Trainee loading error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load trainees for this course."
      );
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadTrainees(selectedCourseId);
    }
  }, [selectedCourseId, loadTrainees]);

const loadAssessmentEvaluation = useCallback(async (assessmentId) => {
  if (!assessmentId) {
    setAssessmentTrainees([]);
    setResultInputs({});
    setSavedResults({});
    return;
  }

  const assessment = assessments.find(
    (item) => String(item.id) === String(assessmentId)
  );

  if (!assessment) return;

  setError("");

  try {
    const [traineeResponse, resultResponse] = await Promise.all([
      api.get(`/trainer/courses/${assessment.course_id}/trainees`),
      api.get(`/trainer/assessments/${assessmentId}/results`),
    ]);

    const traineeList = traineeResponse.data.trainees || [];
    const resultList = resultResponse.data.results || [];

    const inputMap = {};
    const savedMap = {};

    traineeList.forEach((trainee) => {
      const existingResult = resultList.find(
        (result) => result.trainee_id === trainee.id
      );

      inputMap[trainee.id] = {
        marks_obtained: existingResult
          ? String(existingResult.marks_obtained)
          : "",
        feedback: existingResult?.feedback || "",
      };

      if (existingResult) {
        savedMap[trainee.id] = existingResult;
      }
    });

    setAssessmentTrainees(traineeList);
    setResultInputs(inputMap);
    setSavedResults(savedMap);

  } catch (err) {
    console.error("Assessment evaluation loading error:", err);

    setError(
      err.response?.data?.message ||
        "Unable to load assessment evaluation."
    );
  }
}, [assessments]);

useEffect(() => {
  if (selectedAssessmentId && assessments.length > 0) {
    loadAssessmentEvaluation(selectedAssessmentId);
  }
}, [
  selectedAssessmentId,
  assessments,
  loadAssessmentEvaluation
]);
useEffect(() => {
  if (!qrToken || qrExpiry <= 0) return;

  const timer = setInterval(() => {
    setQrExpiry((previous) => Math.max(0, previous - 1));
  }, 1000);

  return () => clearInterval(timer);
}, [qrToken, qrExpiry]);

useEffect(() => {
  if (qrToken && qrExpiry === 0) {
    setQrToken("");
    setSuccess("QR code expired. Generate a new one.");
  }
}, [qrToken, qrExpiry]);


  // -------------------------------------------------
  // LOGOUT
  // -------------------------------------------------

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Unable to log out.");
    }
  };

  // -------------------------------------------------
  // CREATE COURSE
  // -------------------------------------------------

  const handleCourseSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/trainer/courses",
        courseForm
      );

      setSuccess(response.data.message || "Course created successfully.");

      setCourseForm({
        title: "",
        category: "",
        description: "",
        duration: "",
        mode: "Offline",
      });

      await loadDashboard();
      setActiveMenu("My Courses");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create course."
      );
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------
  // SAVE ATTENDANCE
  // -------------------------------------------------

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCourseId) {
      setError("Please select a course.");
      return;
    }

    if (trainees.length === 0) {
      setError("There are no enrolled trainees in this course.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const records = trainees.map((trainee) => ({
      trainee_id: trainee.id,
      status: attendanceRecords[trainee.id] || "Present",
    }));

    try {
      const response = await api.post("/trainer/attendance", {
        course_id: Number(selectedCourseId),
        attendance_date: attendanceDate,
        records,
      });

      setSuccess(
        response.data.message || "Attendance saved successfully."
      );

      await loadDashboard();
      await loadTrainees(selectedCourseId);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------
  // CREATE ASSESSMENT
  // -------------------------------------------------

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...assessmentForm,
        course_id: Number(assessmentForm.course_id),
        total_marks: Number(assessmentForm.total_marks),
      };

      const response = await api.post(
        "/trainer/assessments",
        payload
      );

      setSuccess(
        response.data.message || "Assessment created successfully."
      );

      setAssessmentForm({
        course_id: "",
        title: "",
        description: "",
        total_marks: "100",
        due_date: "",
      });

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create assessment."
      );
    } finally {
      setSaving(false);
    }
  };

const handleSaveResult = async (traineeId) => {

  const assessment = assessments.find(
    (item) => String(item.id) === String(selectedAssessmentId)
  );

  if (!assessment) {
    setError("Please select an assessment.");
    return;
  }

  const input = resultInputs[traineeId];

  if (
    !input ||
    input.marks_obtained === "" ||
    !Number.isInteger(Number(input.marks_obtained))
  ) {
    setError("Enter valid whole-number marks.");
    return;
  }

  const marks = Number(input.marks_obtained);

  if (marks < 0 || marks > assessment.total_marks) {
    setError(
      `Marks must be between 0 and ${assessment.total_marks}.`
    );
    return;
  }

  setSavingResultId(traineeId);
  setError("");
  setSuccess("");

  try {

    const response = await api.post(
      `/trainer/assessments/${selectedAssessmentId}/results`,
      {
        trainee_id: traineeId,
        marks_obtained: marks,
        feedback: input.feedback,
      }
    );

    const percentage = Number(
      ((marks / assessment.total_marks) * 100).toFixed(2)
    );

    const result = {
      trainee_id: traineeId,
      trainee_name:
        assessmentTrainees.find(
          (trainee) => trainee.id === traineeId
        )?.name || "Trainee",
      marks_obtained: marks,
      total_marks: assessment.total_marks,
      percentage,
      result: percentage >= 40 ? "Pass" : "Fail",
      feedback: input.feedback,
    };

    setSavedResults((previous) => ({
      ...previous,
      [traineeId]: result,
    }));

    setSuccess(
      response.data.message || "Marks saved successfully."
    );

  } catch (err) {

    setError(
      err.response?.data?.message ||
        "Unable to save assessment marks."
    );

  } finally {
    setSavingResultId(null);
  }
};


  // -------------------------------------------------
  // FILTER TRAINEES
  // -------------------------------------------------

  const filteredTrainees = trainees.filter((trainee) =>
    [trainee.name, trainee.email, trainee.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      title: "Active Courses",
      value: statistics.active_courses,
      description: "Currently conducting",
      icon: BookOpen,
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      title: "Total Trainees",
      value: statistics.total_trainees,
      description: "Currently enrolled",
      icon: Users,
      bg: "bg-purple-50",
      color: "text-purple-600",
    },
    {
      title: "Average Attendance",
      value: `${statistics.average_attendance}%`,
      description: "Based on recorded attendance",
      icon: ClipboardCheck,
      bg: "bg-green-50",
      color: "text-green-600",
    },
    {
      title: "Completed Courses",
      value: statistics.completed_courses,
      description: "Successfully completed",
      icon: GraduationCap,
      bg: "bg-orange-50",
      color: "text-orange-600",
    },
  ];

  // -------------------------------------------------
  // REUSABLE COURSE SELECT
  // -------------------------------------------------

  const CourseSelect = ({ value, onChange, placeholder }) => (
    <select
      value={value}
      onChange={onChange}
      required
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
    >
      <option value="">{placeholder}</option>
      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          {course.title}
        </option>
      ))}
    </select>
  );

  // -------------------------------------------------
  // PAGE CONTENT
  // -------------------------------------------------

  const renderDashboard = () => (
    <>
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
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
                >
                  <Icon size={23} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">My Courses</h3>
            <p className="mt-1 text-xs text-slate-500">
              Courses created under your trainer account
            </p>
          </div>

          <button
            onClick={() => setActiveMenu("My Courses")}
            className="text-sm font-semibold text-indigo-600"
          >
            View all <ChevronRight size={15} className="inline" />
          </button>
        </div>

        {courses.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No courses created yet. Create your first course from My Courses.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <BookOpen className="text-indigo-600" size={23} />
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    {course.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900">
                  {course.title}
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  {course.category || "General"}
                </p>

                <div className="mt-4 flex justify-between text-xs text-slate-500">
                  <span>{course.trainees} trainees</span>
                  <span>{course.duration || "Duration not set"}</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedCourseId(String(course.id));
                    setActiveMenu("My Trainees");
                  }}
                  className="mt-5 w-full rounded-lg bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  View trainees
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">Quick Actions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Manage your training activities
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Create Course", "My Courses", BookOpen],
              ["Take Attendance", "Attendance", ClipboardCheck],
              ["Create Assessment", "Assessments", FileText],
              ["View Trainees", "My Trainees", Users],
            ].map(([label, menu, Icon]) => (
              <button
                key={label}
                onClick={() => setActiveMenu(menu)}
                className="rounded-xl border border-slate-100 p-4 text-left hover:border-indigo-200 hover:bg-indigo-50"
              >
                <Icon size={22} className="mb-3 text-indigo-600" />
                <p className="text-sm font-semibold text-slate-800">
                  {label}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-green-600" size={25} />
            <h3 className="font-bold text-slate-900">
              Training Overview
            </h3>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            You currently have {statistics.active_courses} active courses
            and {statistics.total_trainees} enrolled trainees.
          </p>

          <p className="mt-3 text-sm text-slate-600">
            Average recorded attendance is{" "}
            <strong>{statistics.average_attendance}%</strong>.
          </p>

          <button
            onClick={() => setActiveMenu("Attendance")}
            className="mt-5 text-sm font-semibold text-indigo-600"
          >
            Manage attendance <ChevronRight size={15} className="inline" />
          </button>
        </div>
      </section>
    </>
  );

  const renderCourses = () => (
    <>
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-bold text-slate-900">Create New Course</h3>

        <form onSubmit={handleCourseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              required
              placeholder="Course title"
              value={courseForm.title}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  title: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />

            <input
              placeholder="Category"
              value={courseForm.category}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  category: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />

            <input
              placeholder="Duration (e.g. 8 Weeks)"
              value={courseForm.duration}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  duration: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />

            <select
              value={courseForm.mode}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  mode: e.target.value,
                })
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="Offline">Offline</option>
              <option value="Online">Online</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <textarea
            rows="3"
            placeholder="Course description"
            value={courseForm.description}
            onChange={(e) =>
              setCourseForm({
                ...courseForm,
                description: e.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={17} />
            {saving ? "Creating..." : "Create Course"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-bold text-slate-900">
          All My Courses ({courses.length})
        </h3>

        {courses.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No courses available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {course.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {course.category}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                    {course.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>{course.duration}</span>
                  <span>{course.mode}</span>
                  <span>{course.trainees} trainees</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedCourseId(String(course.id));
                    setActiveMenu("My Trainees");
                  }}
                  className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Manage Trainees
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderTrainees = () => (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-bold text-slate-900">Trainee Records</h3>
          <p className="mt-1 text-xs text-slate-500">
            Select a course to view its enrolled trainees.
          </p>
        </div>

        <button
          onClick={() => selectedCourseId && loadTrainees(selectedCourseId)}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-600"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="mb-5 max-w-md">
        <CourseSelect
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          placeholder="Select a course"
        />
      </div>

      {selectedCourseId && (
        <div className="relative mb-5 max-w-md">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Search trainees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {!selectedCourseId ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Select a course to view enrolled trainees.
        </p>
      ) : trainees.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No trainees are enrolled in this course yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Trainee</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Attendance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTrainees.map((trainee) => (
                <tr key={trainee.id}>
                  <td className="px-4 py-4 font-semibold">
                    {trainee.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {trainee.email}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {trainee.phone || "Not provided"}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold">
                    {trainee.attendance}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTrainees.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No matching trainees found.
            </p>
          )}
        </div>
      )}
    </section>
  );
  const generateAttendanceQR = async () => {
  if (!selectedCourseId) {
    setError("Please select a course first.");
    return;
  }

  try {
    setQrLoading(true);
    setError("");
    setSuccess("");

    const response = await api.post(
      `/trainer/courses/${selectedCourseId}/attendance/qr-session`,
      {}
    );

    setQrToken(response.data.token);
    setQrExpiry(response.data.valid_for_seconds || 120);

    setSuccess("Attendance QR generated successfully.");
  } catch (err) {
    setError(
      err.response?.data?.message ||
      "Unable to generate attendance QR."
    );
  } finally {
    setQrLoading(false);
  }
};

    const closeAttendanceQR = async () => {
      try {
        await api.post(
          `/trainer/courses/${selectedCourseId}/attendance/qr-session/close`,
          {}
        );

        setQrToken("");
        setQrExpiry(0);
        setSuccess("QR attendance session closed.");
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to close QR session."
        );
      }
    };

  const renderAttendance = () => (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-900">Daily Attendance</h3>
      <p className="mt-1 text-xs text-slate-500">
        Select a course and date, then record each trainee's attendance.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <CourseSelect
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          placeholder="Select a course"
        />

        <input
          type="date"
          value={attendanceDate}
          onChange={(e) => setAttendanceDate(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      {/* QR ATTENDANCE GENERATOR */}
      {selectedCourseId && (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-bold text-slate-900">
                QR Code Attendance
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Generate a temporary QR code for enrolled trainees to scan.
              </p>
            </div>

            <button
              type="button"
              onClick={generateAttendanceQR}
              disabled={qrLoading}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {qrLoading
                ? "Generating..."
                : qrToken
                ? "Generate New QR"
                : "Generate QR Code"}
            </button>
          </div>

          {qrToken && (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5">
              <QRCodeSVG
                value={qrToken}
                size={230}
                level="H"
                includeMargin
              />

              <p className="mt-4 text-sm font-semibold text-slate-800">
                {Math.floor(qrExpiry / 60)}:
                {String(qrExpiry % 60).padStart(2, "0")} remaining
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ask trainees to scan this QR code before it expires.
              </p>

              <button
                type="button"
                onClick={closeAttendanceQR}
                className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Close QR Session
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedCourseId ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Select a course to mark attendance.
        </p>
      ) : trainees.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No enrolled trainees found for this course.
        </p>
      ) : (
        <form onSubmit={handleAttendanceSubmit}>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[550px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Trainee</th>
                  <th className="px-4 py-3">Attendance Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {trainees.map((trainee) => (
                  <tr key={trainee.id}>
                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {trainee.name}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={
                          attendanceRecords[trainee.id] || "Present"
                        }
                        onChange={(e) =>
                          setAttendanceRecords((previous) => ({
                            ...previous,
                            [trainee.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                        <option value="Excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            disabled={saving}
            className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </form>
      )}
    </section>
  );

  
const renderAssessments = () => (
  <>
    {/* CREATE ASSESSMENT */}

    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

      <h3 className="mb-5 font-bold text-slate-900">
        Create New Assessment
      </h3>

      <form
        onSubmit={handleAssessmentSubmit}
        className="space-y-4"
      >

        <CourseSelect
          value={assessmentForm.course_id}
          onChange={(e) =>
            setAssessmentForm({
              ...assessmentForm,
              course_id: e.target.value,
            })
          }
          placeholder="Select course"
        />

        <input
          required
          placeholder="Assessment title"
          value={assessmentForm.title}
          onChange={(e) =>
            setAssessmentForm({
              ...assessmentForm,
              title: e.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
        />

        <textarea
          rows="3"
          placeholder="Assessment description"
          value={assessmentForm.description}
          onChange={(e) =>
            setAssessmentForm({
              ...assessmentForm,
              description: e.target.value,
            })
          }
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          <input
            required
            type="number"
            min="1"
            placeholder="Total marks"
            value={assessmentForm.total_marks}
            onChange={(e) =>
              setAssessmentForm({
                ...assessmentForm,
                total_marks: e.target.value,
              })
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <input
            type="date"
            value={assessmentForm.due_date}
            onChange={(e) =>
              setAssessmentForm({
                ...assessmentForm,
                due_date: e.target.value,
              })
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

        </div>

        <button
          disabled={saving || courses.length === 0}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={17} />
          {saving ? "Creating..." : "Create Assessment"}
        </button>

      </form>
    </section>


    {/* ASSESSMENT LIST */}

    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

      <h3 className="mb-5 font-bold text-slate-900">
        Created Assessments
      </h3>

      {assessments.length === 0 ? (

        <p className="py-8 text-center text-sm text-slate-500">
          No assessments created yet.
        </p>

      ) : (

        <div className="space-y-3">

          {assessments.map((assessment) => (

            <div
              key={assessment.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >

              <div>
                <h4 className="font-semibold text-slate-900">
                  {assessment.title}
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  {assessment.course_title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Total marks: {assessment.total_marks}
                </p>

              </div>

              <div className="text-sm text-slate-500">

                <p>
                  Due: {assessment.due_date || "Not specified"}
                </p>

                <p className="mt-1">
                  Results recorded: {assessment.results_count}
                </p>

                <button
                  onClick={() =>
                    setSelectedAssessmentId(String(assessment.id))
                  }
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Evaluate Trainees
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </section>


    {/* ASSESSMENT EVALUATION */}

    {selectedAssessmentId && (

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h3 className="font-bold text-slate-900">
            Assessment Evaluation
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Enter marks and feedback for each enrolled trainee.
          </p>

        </div>

        {(() => {
          const selectedAssessment = assessments.find(
            (item) =>
              String(item.id) === String(selectedAssessmentId)
          );

          if (!selectedAssessment) return null;

          return (
            <div className="mb-5 rounded-xl bg-indigo-50 p-4">

              <h4 className="font-semibold text-indigo-900">
                {selectedAssessment.title}
              </h4>

              <p className="mt-1 text-xs text-indigo-700">
                Course: {selectedAssessment.course_title}
              </p>

              <p className="mt-1 text-xs text-indigo-700">
                Maximum marks: {selectedAssessment.total_marks}
              </p>

            </div>
          );
        })()}

        {assessmentTrainees.length === 0 ? (

          <p className="py-8 text-center text-sm text-slate-500">
            No trainees enrolled in this assessment's course.
          </p>

        ) : (

          <div className="space-y-4">

            {assessmentTrainees.map((trainee) => {

              const input = resultInputs[trainee.id] || {
                marks_obtained: "",
                feedback: "",
              };

              const marks = Number(input.marks_obtained);

              const selectedAssessment = assessments.find(
                (item) =>
                  String(item.id) === String(selectedAssessmentId)
              );

              const totalMarks = selectedAssessment?.total_marks || 0;

              const validMarks =
                input.marks_obtained !== "" &&
                Number.isInteger(marks) &&
                marks >= 0 &&
                marks <= totalMarks;

              const percentage = validMarks && totalMarks
                ? ((marks / totalMarks) * 100).toFixed(2)
                : null;

              const existingResult = savedResults[trainee.id];

              return (

                <div
                  key={trainee.id}
                  className="rounded-xl border border-slate-200 p-4"
                >

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {trainee.name}
                      </h4>

                      <p className="text-xs text-slate-500">
                        {trainee.email}
                      </p>
                    </div>

                    {existingResult && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Saved
                      </span>
                    )}

                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Marks obtained (out of {totalMarks})
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={totalMarks}
                        step="1"
                        value={input.marks_obtained}
                        onChange={(e) => {

                          setResultInputs((previous) => ({
                            ...previous,
                            [trainee.id]: {
                              ...previous[trainee.id],
                              marks_obtained: e.target.value,
                            },
                          }));

                          setSavedResults((previous) => {
                            const updated = { ...previous };
                            delete updated[trainee.id];
                            return updated;
                          });

                        }}
                        placeholder="Enter marks"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />

                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Feedback
                      </label>

                      <input
                        value={input.feedback}
                        onChange={(e) => {

                          setResultInputs((previous) => ({
                            ...previous,
                            [trainee.id]: {
                              ...previous[trainee.id],
                              feedback: e.target.value,
                            },
                          }));

                          setSavedResults((previous) => {
                            const updated = { ...previous };
                            delete updated[trainee.id];
                            return updated;
                          });

                        }}
                        placeholder="Enter feedback"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />

                    </div>

                  </div>

                  {percentage !== null && (

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">

                      <span className="font-semibold text-slate-700">
                        Percentage: {percentage}%
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          Number(percentage) >= 40
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {Number(percentage) >= 40 ? "Pass" : "Fail"}
                      </span>

                    </div>

                  )}

                  <button
                    onClick={() => handleSaveResult(trainee.id)}
                    disabled={
                      savingResultId === trainee.id || !validMarks
                    }
                    className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    <Save size={15} />

                    {savingResultId === trainee.id
                      ? "Saving..."
                      : existingResult
                        ? "Update Result"
                        : "Save Result"}

                  </button>

                </div>

              );

            })}

          </div>

        )}

      </section>

    )}

  </>
);


  const renderSchedule = () => (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <CalendarDays size={35} className="mb-4 text-indigo-600" />
      <h3 className="font-bold text-slate-900">Training Schedule</h3>
      <p className="mt-2 text-sm text-slate-500">
        The schedule module is not connected to the backend yet. We will add
        session scheduling, class timings, and training locations in a
        subsequent step.
      </p>
    </section>
  );
  const renderStudyMaterials = () => (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Study Materials</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload videos, notes, books and other learning resources for your courses.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label
          htmlFor="material-course-select"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Select Course
        </label>
        <select
          id="material-course-select"
          value={materialCourseId}
          onChange={(e) => {
            setMaterialCourseId(e.target.value);
            setMaterialFile(null);
            setMaterialMessage("");
          }}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
        >
          <option value="">Choose a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          You have not created any courses yet. Create a course first before adding study materials.
        </div>
      ) : materialCourseId ? (
        <>
          <form
            onSubmit={handleMaterialUpload}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-slate-900">Add New Material</h3>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="material-title">
                Material Title
              </label>
              <input
                id="material-title"
                required
                value={materialForm.title}
                onChange={(e) =>
                  setMaterialForm((previous) => ({ ...previous, title: e.target.value }))
                }
                placeholder="e.g. Introduction to Cooperative Management"
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="material-type">
                Material Type
              </label>
              <select
                id="material-type"
                value={materialForm.material_type}
                onChange={(e) =>
                  setMaterialForm((previous) => ({ ...previous, material_type: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="notes">Notes</option>
                <option value="video">Video</option>
                <option value="book">Book</option>
                <option value="presentation">Presentation</option>
                <option value="document">Document</option>
                <option value="other">Other Resource</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="material-description">
                Description
              </label>
              <textarea
                id="material-description"
                rows={3}
                value={materialForm.description}
                onChange={(e) =>
                  setMaterialForm((previous) => ({ ...previous, description: e.target.value }))
                }
                placeholder="Briefly describe this resource..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="trainer-material-file">
                Upload File
              </label>
              <input
                id="trainer-material-file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.mp4,.webm,.mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setMaterialFile(null);
                    return;
                  }
                  if (file.size > 100 * 1024 * 1024) {
                    setMaterialFile(null);
                    e.target.value = "";
                    setMaterialMessage("File size must not exceed 100 MB.");
                    return;
                  }
                  setMaterialMessage("");
                  setMaterialFile(file);
                }}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum file size: 100 MB. Supported: PDF, Word, PowerPoint, text, images, MP4, WebM and MP3.
              </p>
              {materialFile && (
                <p className="mt-2 break-all text-xs text-slate-600">
                  Selected: {materialFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="material-url">
                External Resource URL (optional)
              </label>
              <input
                id="material-url"
                type="url"
                value={materialForm.external_url}
                onChange={(e) =>
                  setMaterialForm((previous) => ({ ...previous, external_url: e.target.value }))
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>

            <button
              type="submit"
              disabled={materialSaving}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {materialSaving ? "Uploading..." : "Add Study Material"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold text-slate-900">Uploaded Materials</h3>

            {materialsLoading ? (
              <p className="text-slate-500">Loading materials...</p>
            ) : materials.length === 0 ? (
              <p className="text-slate-500">No study materials added to this course yet.</p>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{material.title}</p>
                      <p className="mt-1 text-xs capitalize text-indigo-600">
                        {material.material_type || "resource"}
                      </p>
                      {material.description && (
                        <p className="mt-2 text-sm text-slate-500">{material.description}</p>
                      )}
                      {material.file_name && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          File: {material.file_name}
                        </p>
                      )}
                      {material.external_url && (
                        <a
                          href={material.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
                        >
                          Open External Resource
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMaterialDelete(material.id)}
                      className="shrink-0 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Select a course to upload and manage its study materials.
        </p>
      )}

      {materialMessage && (
        <div
          role="status"
          className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"
        >
          {materialMessage}
        </div>
      )}
    </section>
  );

  const renderActivePage = () => {
    switch (activeMenu) {
      case "My Courses":
        return renderCourses();
      case "Study Materials":
        return renderStudyMaterials();
      case "My Trainees":
        return renderTrainees();
      case "Attendance":
        return renderAttendance();
      case "Assessments":
        return renderAssessments();
      case "Schedule":
        return renderSchedule();
      case "Settings":
        return (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-bold">Trainer Settings</h3>
            <p className="mt-2 text-sm text-slate-500">
              Profile and account settings will be added here.
            </p>
          </section>
        );
      default:
        return renderDashboard();
    }
  };

  // -------------------------------------------------
  // MAIN UI
  // -------------------------------------------------

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-800">

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap size={23} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">NCCT</h1>
              <p className="text-xs text-slate-500">Trainer Portal</p>
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
            Training Workspace
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveMenu(item.label);
                    setError("");
                    setSuccess("");
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    activeMenu === item.label
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <p className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          <button
            onClick={() => setActiveMenu("Settings")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Settings size={19} />
            Settings
          </button>
        </div>

        <div className="mt-auto border-t border-slate-100 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {trainerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {trainerName}
              </p>
              <p className="text-xs text-slate-500">Trainer</p>
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
                {activeMenu}
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                Trainer workspace / {activeMenu}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboard}
              title="Refresh dashboard"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <RefreshCw size={19} />
            </button>

            <Bell size={20} className="text-slate-500" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {trainerName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="w-full min-w-0 space-y-7 px-4 py-5 sm:px-6 lg:px-8">

          <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-lg sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm text-indigo-100">
                NCCT Training Ecosystem
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Welcome back, {trainerName}!
              </h1>
              <p className="mt-2 text-sm text-indigo-100">
                Manage your courses, trainees, attendance and assessments.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveMenu("My Courses");
                setSuccess("");
                setError("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              <Plus size={18} />
              Create Course
            </button>
          </section>

          {error && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <span>{success}</span>
              <button onClick={() => setSuccess("")}>
                <X size={17} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <RefreshCw className="mx-auto mb-3 animate-spin text-indigo-600" size={28} />
              <p className="text-sm text-slate-500">
                Loading trainer dashboard...
              </p>
            </div>
          ) : (
            renderActivePage()
          )}

          <footer className="pb-4 text-center text-xs text-slate-400">
            © 2026 NCCT Training Ecosystem. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}

export default TrainerDashboard;
