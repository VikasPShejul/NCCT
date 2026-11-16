
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Award, Search, ShieldCheck, ShieldX } from "lucide-react";
import api from "../services/api";

export default function CertificateVerify() {
  const { certificateNumber: routeNumber } = useParams();

  const [certificateNumber, setCertificateNumber] = useState(
    routeNumber || ""
  );
  const [certificate, setCertificate] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const verifyCertificate = async (event) => {
    event.preventDefault();

    const number = certificateNumber.trim();

    if (!number) {
      setError("Please enter a certificate ID.");
      return;
    }

    try {
      setStatus("loading");
      setCertificate(null);
      setError("");

      const response = await api.get(
        `/certificates/verify/${encodeURIComponent(number)}`
      );

      if (response.data.valid) {
        setCertificate(response.data.certificate);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch (err) {
      setStatus("error");
      setError(
        err.response?.data?.message ||
          "Unable to verify the certificate. Please try again."
      );
    }
  };

  React.useEffect(() => {
    if (routeNumber) {
      verifyCertificate({ preventDefault: () => {} });
    }
  }, [routeNumber]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Award size={34} />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] text-blue-700">
            NCCT CERTIFICATION PORTAL
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Certificate Verification
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Verify the authenticity of a certificate issued through the NCCT
            training portal.
          </p>
        </div>

        <form onSubmit={verifyCertificate} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Certificate ID
          </label>
          <input
            value={certificateNumber}
            onChange={(event) => setCertificateNumber(event.target.value)}
            placeholder="Example: NCCT-2026-XXXXXXXX"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Search size={18} />
            {status === "loading" ? "Verifying..." : "Verify Certificate"}
          </button>
        </form>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "valid" && certificate && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-green-700" size={30} />
              <div>
                <h2 className="font-bold text-green-800">
                  Valid Certificate
                </h2>
                <p className="text-xs text-green-700">
                  This certificate exists in the NCCT records.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-green-200 pt-4 text-sm">
              <div>
                <p className="text-xs text-green-700">Trainee Name</p>
                <p className="font-semibold text-slate-900">
                  {certificate.trainee_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700">Training Course</p>
                <p className="font-semibold text-slate-900">
                  {certificate.course_title}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700">Certificate ID</p>
                <p className="break-all font-semibold text-slate-900">
                  {certificate.certificate_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700">Date of Issue</p>
                <p className="font-semibold text-slate-900">
                  {certificate.issued_at
                    ? new Date(certificate.issued_at).toLocaleDateString("en-IN")
                    : "Not available"}
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <ShieldX className="text-red-700" size={30} />
              <div>
                <h2 className="font-bold text-red-800">
                  Certificate Not Found
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  No matching certificate exists in the NCCT records. Check the
                  certificate ID and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          NCCT Training and Employment Ecosystem
        </p>
      </div>
    </div>
  );
}
