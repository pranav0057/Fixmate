
backend_url=import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Code2, User, Lock, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { toast } from "react-hot-toast";
import LoginImage from "../assets/Image2.png";

const LoginPage = () => {
  const { setUser, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to show toast on redirect
  useEffect(() => {
    if (location.state?.from) {
      toast.error("You have to Login First to Try the Functionality");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redirect if user is already logged in
  if (user) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Form submit handler (no changes)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please fill in both username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${backend_url}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Login successful!");
        console.log("User logged in:", data);
        setUser(data.user);
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        toast.error(data.message || "Login failed!");
      }
    } catch (error) {
      console.error("Error during login:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* --- Main Two-Column Card --- */}
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        
        {/* --- Left Column (Form) --- */}
        <div className="p-8 md:p-12">
          {/* Form Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Code2 className="w-8 h-8 text-teal-400" />
              <h2 className="text-3xl font-bold text-white">Sign In</h2>
            </div>
            <p className="text-gray-400">Sign in to your FixMate account</p>
          </div>

          {/* Google Login */}
          <GoogleAuthButton />

          <form className="space-y-6 mt-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-2 hover: cursor-text"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2 hover: cursor-text"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 hover: cursor-pointer" />
                  ) : (
                    <Eye className="h-5 w-5 hover: cursor-pointer" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 hover: cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 text-sm text-gray-300 hover: cursor-text"
                >
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover: cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">
                  Don't have an account?
                </span>
              </div>
            </div>
          </div>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create a new account
            </Link>
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* --- Right Column (Visual) --- */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gray-900/50">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-6">
            Welcome back
          </h2>
          <p className="text-gray-400 text-center mb-8">
            The ultimate platform for real-time collaborative coding.
          </p>

          <img
            // --- 2. Use your imported image here, with the placeholder as a fallback ---
            src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnc1MW9ycm9mMXNpb2NndGY1c3A0NnptNW5udTRweDBwajBxdTY5ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/QJ8bR5An4VC59FvVcx/giphy.gif"
            alt="Collaborative coding"
            className="w-auto h-full object-cover   "
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
