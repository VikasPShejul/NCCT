
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import AdminDashboard from "./pages/admin/AdminDashboard";
import TraineeDashboard from "./pages/trainee/TraineeDashboard";
import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import TrainerCertificates from "./pages/trainer/TrainerCertificates";
import TraineeCertificates from "./pages/trainee/TraineeCertificates";
import CertificateVerify from "./pages/CertificateVerify";
import RecruiterEmployment from "./pages/recruiter/RecruiterEmployment";
import TraineeEmployment from "./pages/trainee/TraineeEmployment";

function Unauthorized() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-red-600">
                    403 - Unauthorized
                </h1>
                <p className="text-gray-500 mt-3">
                    You cannot access this dashboard.
                </p>
                <a href="/login" className="text-blue-700 mt-5 inline-block">
                    Back to Login
                </a>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route
                    path="/trainer/certificates"
                    element={
                        <ProtectedRoute allowedRoles={["trainer"]}>
                        <TrainerCertificates />
                        </ProtectedRoute>
                    }
                    />

                    <Route
                    path="/trainee/certificates"
                    element={
                        <ProtectedRoute allowedRoles={["trainee"]}>
                        <TraineeCertificates />
                        </ProtectedRoute>
                    }
                    />

                    <Route
                    path="/verify-certificate"
                    element={<CertificateVerify />}
                    />

                    <Route
                    path="/verify-certificate/:certificateNumber"
                    element={<CertificateVerify />}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/unauthorized" element={<Unauthorized />} />

                    <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={["trainee"]} />}>
                        <Route path="/trainee/dashboard" element={<TraineeDashboard />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={["trainer"]} />}>
                        <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={["recruiter"]} />}>
                        <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
                    </Route>

                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                    <Route
                    path="/recruiter/employment"
                    element={
                        <ProtectedRoute allowedRoles={["recruiter"]}>
                        <RecruiterEmployment />
                        </ProtectedRoute>
                    }
                    />

                    <Route
                    path="/trainee/employment"
                    element={
                        <ProtectedRoute allowedRoles={["trainee"]}>
                        <TraineeEmployment />
                        </ProtectedRoute>
                    }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
