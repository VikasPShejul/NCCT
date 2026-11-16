
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    GraduationCap,
    User,
    Mail,
    Lock,
    ArrowRight,
    Eye,
    EyeOff,
    CheckCircle
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Register() {

    const navigate = useNavigate();
    const { register } = useAuth();

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: "",
        confirm_password: ""
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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
        setSuccess("");

        if (form.full_name.trim().length < 2) {
            setError("Please enter your full name.");
            return;
        }

        if (form.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {

            await register({
                full_name: form.full_name.trim(),
                email: form.email,
                password: form.password
            });

            setSuccess("Account created successfully! Redirecting to login...");

            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1500);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">

            <div className="w-full max-w-xl">

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-7 sm:p-10">

                    {/* HEADER */}

                    <div className="text-center mb-8">

                        <div className="inline-flex bg-blue-50 p-4 rounded-2xl mb-4">
                            <GraduationCap
                                size={42}
                                className="text-blue-700"
                            />
                        </div>

                        <h1 className="text-3xl font-bold text-slate-900">
                            Create Your Account
                        </h1>

                        <p className="text-slate-500 mt-2">
                            Join the NCCT Cooperative Training Ecosystem
                        </p>

                    </div>


                    {/* SUCCESS MESSAGE */}

                    {success && (

                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-5 flex gap-3 items-center">

                            <CheckCircle size={20} />

                            <p className="text-sm">{success}</p>

                        </div>

                    )}


                    {/* ERROR MESSAGE */}

                    {error && (

                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-5 text-sm">
                            {error}
                        </div>

                    )}


                    {/* REGISTRATION FORM */}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* FULL NAME */}

                        <div>

                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Full Name
                            </label>

                            <div className="relative">

                                <User
                                    size={19}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    required
                                    className="w-full border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                        </div>


                        {/* EMAIL */}

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
                                    className="w-full border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                        </div>


                        {/* PASSWORD */}

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
                                    placeholder="Minimum 8 characters"
                                    required
                                    className="w-full border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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


                        {/* CONFIRM PASSWORD */}

                        <div>

                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Confirm Password
                            </label>

                            <div className="relative">

                                <Lock
                                    size={19}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="password"
                                    name="confirm_password"
                                    value={form.confirm_password}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    required
                                    className="w-full border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                />

                            </div>

                        </div>


                        {/* SUBMIT BUTTON */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition shadow-lg shadow-blue-700/20"
                        >

                            {loading ? "Creating Account..." : "Create Account"}

                            {!loading && <ArrowRight size={19} />}

                        </button>

                    </form>


                    {/* LOGIN LINK */}

                    <div className="text-center mt-7">

                        <p className="text-slate-500 text-sm">
                            Already have an account?{" "}

                            <Link
                                to="/login"
                                className="text-blue-700 font-bold hover:underline"
                            >
                                Sign In
                            </Link>
                        </p>

                    </div>

                </div>


                <p className="text-center text-xs text-slate-400 mt-6">
                    National Council for Cooperative Training
                </p>

            </div>

        </div>

    );

}

export default Register;
