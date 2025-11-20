backend_url=import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx"; // Imports your file
import {
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import { Code2, User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import PasswordStrengthBar from "../components/PasswordStrengthBar"; 
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";
import { useDebounce } from "../utils/useDebounce"; 
import { toast } from "react-hot-toast";
import RegisterImage from "../assets/Image3.png";


const RegisterPage = () => {
  const { setUser, user } = useAuth();
  

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "", 
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const debouncedUsername = useDebounce(formData.username, 500);

  const [passwordValidity, setPasswordValidity] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const [nameError, setNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState(""); // --- ADDED ---
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();


  if (user) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }


  useEffect(() => {
    if (!debouncedUsername || usernameError) {
      setIsUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      try {
        const res = await fetch(
          `${backend_url}/auth/check-username?username=${debouncedUsername}`
        );
        const data = await res.json();
        setIsUsernameAvailable(data.available);
      } catch (err) {
        console.error(err);
        setIsUsernameAvailable(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, usernameError]);


  useEffect(() => {
    const password = formData.password;
    setPasswordValidity({
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    });
  }, [formData.password]);

  const isPasswordValid = Object.values(passwordValidity).every(Boolean);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Name validation
    if (name === "name") {
      if (!value.trim()) setNameError("Name can't be empty");
      else if (value.length > 50)
        setNameError("Name cannot be greater than 50 characters");
      else setNameError("");
    }

    // Username validation
    if (name === "username") {
      if (!value.trim()) {
        setUsernameError("Username can't be empty");
        setIsUsernameAvailable(null);
      } else if (value.length < 3 || value.length > 20) {
        setUsernameError("Username must be 3-20 characters");
        setIsUsernameAvailable(null);
      } else if (/\s/.test(value)) {
        setUsernameError("Username cannot contain spaces");
        setIsUsernameAvailable(null);
      } else {
        setUsernameError("");
      }
    }

    // --- ADDED --- (Email validation)
    if (name === "email") {
      if (!value.trim()) {
        setEmailError("Email can't be empty");
      } else if (!/\S+@\S+\.\S+/.test(value)) { // Simple email regex
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }

    // Reset confirm password error
    if (name === "password" || name === "confirmPassword")
      setConfirmPasswordError("");
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      return;
    }

    // --- MODIFIED --- (Added emailError check)
    if (nameError || usernameError || emailError || !isPasswordValid) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // --- MODIFIED --- (Added email to body)
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          email: formData.email, 
          password: formData.password,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Registration successful! Welcome.");
        setUser(data.user);
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        toast.error(data.message || "Registration failed.");
        console.error(data.errors);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- MODIFIED --- (Added emailError check)
  const isSubmitDisabled =
    isLoading ||
    !isPasswordValid ||
    !isUsernameAvailable ||
    nameError ||
    usernameError ||
    emailError; 

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
              <h2 className="text-3xl font-bold text-white">Create Account</h2>
            </div>
            <p className="text-gray-400">Join FixMate to start collaborating</p>
          </div>

          <GoogleAuthButton />

          <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-2 hover: cursor-text"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Enter your full name"
                />
              </div>
              {nameError && (
                <div className="mt-1 text-sm text-red-500">
                  &nbsp;&nbsp;&nbsp;{nameError}
                </div>
              )}
            </div>

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
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Enter your username"
                />
              </div>
              <div className="mt-1 text-sm h-5 relative">
                {usernameError && (
                  <span className="absolute text-red-500">
                    &nbsp;&nbsp;{usernameError}
                  </span>
                )}
                {!usernameError && isUsernameAvailable === true && (
                  <span className="absolute text-green-500">
                    &nbsp;&nbsp;&nbsp;Username available!
                  </span>
                )}
                {!usernameError && isUsernameAvailable === false && (
                  <span className="absolute text-red-500">
                    &nbsp;&nbsp;&nbsp;Username taken!
                  </span>
                )}
              </div>
            </div>
            
            {/* --- ADDED --- (Email Input) */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2 hover: cursor-text"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Enter your email"
                />
              </div>
              <div className="mt-1 text-sm h-5 relative">
                {emailError && (
                  <span className="absolute text-red-500">
                    &nbsp;&nbsp;{emailError}
                  </span>
                )}
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
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Create a password"
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
              {formData.password && (
                <>
                  <PasswordStrengthBar password={formData.password} />
                  <div className="mt-2 text-sm space-y-1">
                    <p
                      className={`transition-all duration-300 ${
                        passwordValidity.length
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      • At least 6 characters
                    </p>
                    <p
                      className={`transition-all duration-300 ${
                        passwordValidity.uppercase
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      • One uppercase letter
                    </p>
                    <p
                      className={`transition-all duration-300 ${
                        passwordValidity.lowercase
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      • One lowercase letter
                    </p>
                    <p
                      className={`transition-all duration-300 ${
                        passwordValidity.number
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      • One number
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-2 hover: cursor-text"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-400"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 hover: cursor-pointer" />
                  ) : (
                    <Eye className="h-5 w-5 hover: cursor-pointer" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <div className="mt-1 text-sm text-red-500">
                  &nbsp;&nbsp;&nbsp;{confirmPasswordError}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover: cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Create Account"
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
                  Already have an account?
                </span>
              </div>
            </div>
          </div>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>

        {/* --- Right Column (Visual) --- */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gray-900/50">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-6">
            Join the Community
          </h2>
          <p className="text-gray-400 text-center mb-8">
            Create an account to save your work, track your progress, and
            collaborate with others.
          </p>

          <img
            src=
              "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjFnM2o0MjVwazhqdmdyaWQ1djI0eXQ3bHRzdnI2NmJoa2hkcTEyZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MUzsTOvRVrYADJmhLu/giphy.gif"
            
            alt="Collaborative coding"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;