
import React, { useEffect, useState } from "react";
import { Award, CheckCircle, RefreshCw } from "lucide-react";
import api from "../../services/api";

export default function TrainerCertificates() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/trainer/courses");
      const list = response.data.courses || [];
      setCourses(list);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const loadTrainees = async (courseId) => {
    setSelectedCourse(courseId);
    setTrainees([]);
    setMessage("");
    setError("");

    if (!courseId) return;

    try {
      setLoading(true);
      const response = await api.get(
        `/trainer/courses/${courseId}/trainees`
      );
      setTrainees(response.data.trainees || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load enrolled trainees."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (traineeId, status) => {
    try {
      setError("");
      setMessage("");

      await api.put(
        `/trainer/courses/${selectedCourse}/enrollments/${traineeId}/status`,
        { status }
      );

      setTrainees((previous) =>
        previous.map((trainee) =>
          (trainee.trainee_id ?? trainee.id) === traineeId
            ? { ...trainee, enrollment_status: status, status }
            : trainee
        )
      );

      setMessage("Course status updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update course status."
      );
    }
  };

  const issueCertificate = async (traineeId) => {
    const confirmed = window.confirm(
      "Issue a certificate to this trainee? This action cannot be repeated for the same course."
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await api.post(
        `/trainer/courses/${selectedCourse}/certificates`,
        { trainee_id: traineeId }
      );

      setMessage(
        `Certificate issued: ${response.data.certificate.certificate_number}`
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not issue certificate."
      );
    }
  };

  const selectedCourseData = courses.find(
    (course) => String(course.id ?? course.course_id) === String(selectedCourse)
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-700">
              <Award size={24} />
              <span className="text-sm font-semibold">NCCT CERTIFICATION</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Certificate Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete course enrollment and issue trainee certificates.
            </p>
          </div>

          <button
            onClick={loadCourses}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Training Course
          </label>

          <select
            value={selectedCourse}
            onChange={(event) => loadTrainees(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 sm:max-w-xl"
          >
            <option value="">Choose a course</option>
            {courses.map((course) => (
              <option
                key={course.id ?? course.course_id}
                value={course.id ?? course.course_id}
              >
                {course.title}
              </option>
            ))}
          </select>

          {selectedCourseData && (
            <p className="mt-3 text-sm text-slate-500">
              Selected course:{" "}
              <span className="font-semibold text-slate-800">
                {selectedCourseData.title}
              </span>
            </p>
          )}
        </section>

        {selectedCourse && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900">
                Enrolled Trainees
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Mark course completion before issuing a certificate.
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <RefreshCw className="mx-auto mb-2 animate-spin" />
                Loading trainees...
              </div>
            ) : trainees.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No enrolled trainees found for this course.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Trainee</th>
                      <th className="px-5 py-4">Attendance</th>
                      <th className="px-5 py-4">Course Status</th>
                      <th className="px-5 py-4">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trainees.map((trainee) => {
                      const traineeId = trainee.trainee_id ?? trainee.id;
                      const traineeName =
                        trainee.full_name ?? trainee.name ?? "Trainee";
                      const status =
                        trainee.enrollment_status ?? trainee.status ?? "Enrolled";

                      return (
                        <tr key={traineeId}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {traineeName}
                            </p>
                            <p className="text-xs text-slate-500">
                              ID: {traineeId}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {trainee.attendance_percentage ?? 0}%
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={status}
                              onChange={(event) =>
                                updateStatus(traineeId, event.target.value)
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="Enrolled">Enrolled</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Dropped">Dropped</option>
                            </select>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              disabled={status !== "Completed"}
                              onClick={() => issueCertificate(traineeId)}
                              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Award size={15} />
                              Issue Certificate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          <CheckCircle size={19} className="mt-0.5 shrink-0" />
          A certificate can only be issued after the trainee's enrollment status
          is changed to Completed.
        </div>
      </div>
    </div>
  );
}
