
import React, { useEffect, useState } from "react";
import { Award, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import api from "../../services/api";

export default function TraineeCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/trainee/certificates");
      setCertificates(response.data.certificates || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load your certificates."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const printCertificate = (certificate) => {
    const verificationUrl = `${window.location.origin}/verify-certificate/${encodeURIComponent(
      certificate.certificate_number
    )}`;

    const printWindow = window.open("", "_blank", "width=1000,height=750");

    if (!printWindow) {
      setError("Please allow pop-ups to print your certificate.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NCCT Certificate - ${certificate.certificate_number}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 35px;
            font-family: Georgia, "Times New Roman", serif;
            color: #172554;
          }
          .certificate {
            min-height: 650px;
            border: 12px double #1e40af;
            padding: 42px;
            text-align: center;
            position: relative;
          }
          .inner {
            border: 1px solid #bfdbfe;
            min-height: 540px;
            padding: 35px 25px;
          }
          .brand {
            font-family: Arial, sans-serif;
            font-size: 15px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #1d4ed8;
          }
          h1 {
            font-size: 38px;
            margin: 35px 0 10px;
            letter-spacing: 2px;
          }
          .subtitle { font-size: 17px; }
          .name {
            font-size: 34px;
            font-weight: bold;
            margin: 25px 0;
            color: #1e3a8a;
          }
          .course {
            font-size: 25px;
            font-weight: bold;
            margin: 18px 0;
          }
          .details {
            margin-top: 35px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.8;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 45px;
            font-family: Arial, sans-serif;
            font-size: 12px;
          }
          .verify {
            margin-top: 25px;
            font-family: Arial, sans-serif;
            font-size: 10px;
            overflow-wrap: anywhere;
          }
          @page { size: landscape; margin: 10mm; }
          @media print {
            body { padding: 0; }
            .certificate { min-height: 175mm; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="inner">
            <div class="brand">NCCT TRAINING & DEVELOPMENT</div>
            <h1>CERTIFICATE OF COMPLETION</h1>
            <p class="subtitle">This certificate is proudly presented to</p>
            <div class="name">${escapeHtml(certificate.trainee_name)}</div>
            <p class="subtitle">for successfully completing the training programme</p>
            <div class="course">${escapeHtml(certificate.course_title)}</div>
            <p class="subtitle">
              We recognize the learner's participation and successful completion
              of this training programme.
            </p>
            <div class="details">
              Certificate ID: ${escapeHtml(certificate.certificate_number)}<br>
              Date of Issue: ${escapeHtml(formatDate(certificate.issued_at))}
            </div>
            <div class="footer">
              <div>NCCT<br>Authorized Training Record</div>
              <div>Certificate Verification<br>${escapeHtml(verificationUrl)}</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]);

  const formatDate = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-IN");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-700">
              <Award size={24} />
              <span className="text-sm font-semibold">MY ACHIEVEMENTS</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              My Certificates
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View, print, and verify your completed training certificates.
            </p>
          </div>

          <button
            onClick={loadCertificates}
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

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
            Loading certificates...
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Award className="mx-auto mb-4 text-slate-400" size={45} />
            <h2 className="font-semibold text-slate-800">
              No certificates available
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Your certificates will appear here after your trainer issues them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {certificates.map((certificate) => (
              <div
                key={certificate.certificate_number}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <Award size={27} />
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    <ShieldCheck size={14} />
                    Issued
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  {certificate.course_title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Awarded to {certificate.trainee_name}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Certificate ID</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {certificate.certificate_number}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">Date of Issue</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(certificate.issued_at)}
                  </p>
                </div>

                <button
                  onClick={() => printCertificate(certificate)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Printer size={17} />
                  Print Certificate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
