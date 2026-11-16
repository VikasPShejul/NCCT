
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    GraduationCap,
    Mail,
    Lock,
    ArrowRight,
    Eye,
    EyeOff
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Login() {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();
        setError("");
        setLoading(true);

        try {

            const user = await login(
                form.email,
                form.password
            );

            const dashboardRoutes = {
                admin: "/admin/dashboard",
                trainee: "/trainee/dashboard",
                trainer: "/trainer/dashboard",
                recruiter: "/recruiter/dashboard"
            };

            navigate(
                dashboardRoutes[user.role] || "/login",
                { replace: true }
            );

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Unable to connect to the server."
            );

        } finally {
            setLoading(false);
        }
    };

    return (

        <div className="min-h-screen flex bg-slate-50">

            {/* LEFT BRANDING SECTION */}

            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white p-14 flex-col justify-between">

                <div className="flex items-center gap-3">

                    <div className="bg-white/10 p-3 rounded-xl">
                        <GraduationCap size={36} />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold">
                            NCCT Portal
                        </h1>

                        <p className="text-blue-200 text-sm">
                            Smart Cooperative Ecosystem
                        </p>
                    </div>

                </div>

                <div className="max-w-xl">

                    <span className="bg-blue-700/50 px-4 py-2 rounded-full text-sm">
                        AI & LMS Enabled Platform
                    </span>

                    <h2 className="text-5xl font-bold leading-tight mt-8">
                        Empowering Rural India Through Digital Learning
                    </h2>

                    <p className="text-blue-200 mt-6 text-lg leading-relaxed">
                        A unified platform connecting cooperative
                        training, digital education, skill development
                        and employment opportunities.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-10">

                        <div className="bg-white/10 rounded-xl p-4">
                            <h3 className="font-bold text-xl">
                                Smart LMS
                            </h3>
                            <p className="text-blue-200 text-sm mt-1">
                                Interactive learning
                            </p>
                        </div>

                        <div className="bg-white/10 rounded-xl p-4">
                            <h3 className="font-bold text-xl">
                                AI Career
                            </h3>
                            <p className="text-blue-200 text-sm mt-1">
                                Intelligent guidance
                            </p>
                        </div>

                    </div>

                </div>

                <p className="text-blue-300 text-sm">
                    National Council for Cooperative Training
                </p>

            </div>


            {/* RIGHT LOGIN SECTION */}

            <div className="flex-1 flex items-center justify-center p-6 sm:p-10">

                <div className="w-full max-w-md">

                    <div className="text-center mb-9 lg:hidden">

                        <GraduationCap
                            size={48}
                            className="mx-auto text-blue-800"
                        />

                        <h1 className="text-2xl font-bold text-blue-950 mt-2">
                            NCCT Portal
                        </h1>

                    </div>

                    <div className="mb-8">

                        <p className="text-blue-700 font-semibold text-sm uppercase tracking-wider">
                            Welcome Back
                        </p>

                        <h2 className="text-3xl font-bold text-slate-900 mt-2">
                            Sign in to your account
                        </h2>

                        <p className="text-slate-500 mt-3">
                            Enter your credentials to continue.
                        </p>

                    </div>


                    {/* ERROR MESSAGE */}

                    {error && (

                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
                            {error}
                        </div>

                    )}


                    {/* LOGIN FORM */}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>

                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Email Address
                            </label>

                            <div className="relative">

                                <Mail
                                    size={19}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="example@gmail.com"
                                    required
                                    className="w-full border border-slate-200 bg-white rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                                />

                            </div>

                        </div>


                        <div>

                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Password
                            </label>

                            <div className="relative">

                                <Lock
                                    size={19}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full border border-slate-200 bg-white rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                >
                                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>

                            </div>

                        </div>


                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition shadow-lg shadow-blue-700/20"
                        >

                            {loading ? "Signing in..." : "Sign In"}

                            {!loading && <ArrowRight size={19} />}

                        </button>

                    </form>


                    <div className="mt-8 text-center">

                        <p className="text-slate-500">
                            Don't have an account?{" "}

                            <Link
                                to="/register"
                                className="text-blue-700 font-bold hover:underline"
                            >
                                Register Now
                            </Link>

                        </p>

                    </div>

                    <div className="border-t border-slate-200 mt-9 pt-6 text-center">

                        <p className="text-xs text-slate-400">
                            © 2026 NCCT Digital Ecosystem
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;
