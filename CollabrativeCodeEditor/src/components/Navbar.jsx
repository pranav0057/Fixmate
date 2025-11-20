
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Code2, Menu, X, User, Code } from "lucide-react"; // Removed Code2Icon, it wasn't used
import { toast } from 'react-hot-toast';

const Navbar = () => {
  const { user, setUser } = useAuth(); // Get user and setter from context
  console.log(user);
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  const isActive = (path) => location.pathname === path;

  // --- Scroll listener ---
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // --- Logout Handler (with toast) ---
  const handleLogout = async (e) => {
    e.preventDefault();
    setIsLoggingOut(true);
    try {
      // Call backend to clear httpOnly cookie
      await fetch("http://localhost:4000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout API call failed:", err);
      toast.error("Logout API call failed.");
    } finally {
      // Always clear context and navigate
      setUser(null);
      toast.success("Logged out successfully!");
      
      setIsLoggingOut(false);
      setIsMenuOpen(false); // Close mobile menu
      navigate("/");
    }
  };

  return (
    <nav
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 
                w-[90%] max-w-7xl z-50 transition-transform duration-300
                ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}
    >
      {/* Glass Gradient Background */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-teal-600/20 via-cyan-600/20 to-teal-600/20 
                        backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg"
      ></div>

      {/* Navbar Content */}
      <div className="relative flex justify-between items-center h-16 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
          <Code2 className="w-8 h-8 text-teal-400" />
          <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            FixMate
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive(link.path)
                  ? "text-teal-400 bg-white/10 shadow-sm"
                  : "text-gray-200 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Code Editor Button (only when logged in) */}
          {user && (
            <Link
              to="/code-editor"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive("/code-editor")
                  ? "bg-white/10 shadow-sm bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent"
                  : "text-gray-200 hover:text-white hover:bg-white/10"
              }`}
            >
              {/* --- 1. REMOVED ICON, just text as requested --- */}
              <span>Coding IDE</span>
            </Link>
          )}

          {/* --- 2. MODIFIED Auth Section (Desktop) --- */}
          {user ? (
            // Use flex container to hold both link and button
            <div className="flex items-center space-x-4">
              {/* This is now a link to the dashboard */}
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive("/dashboard")
                    ? "text-teal-400 bg-white/10 shadow-sm" // Active style
                    : "text-gray-200 hover:text-white hover:bg-white/10" // Default style
                }`}
              >
                <User className="w-4 h-4 text-teal-400" />
                <span>{user.username.toUpperCase()}</span>
              </Link>
              
              {/* Logout button is now a sibling, removed m-5 */}
              <form onSubmit={handleLogout}>
                <button
                  type="submit"
                  disabled={isLoggingOut}
                  className="flex items-center space-x-1 px-4 py-2 hover:cursor-pointer bg-gradient-to-r 
                              from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 
                              rounded-lg transition-all duration-200 shadow-md hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Logout"
                  )}
                </button>
              </form>
            </div>
          ) : (
            // Login button remains the same
            <Link
              to="/login"
              className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r 
                        from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 
                        rounded-lg transition-all duration-200 shadow-md hover:shadow-teal-500/30"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-200 hover:text-white p-2"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="relative md:hidden border-t border-white/10 rounded-b-2xl bg-black/30 backdrop-blur-xl">
          <div className="flex flex-col space-y-2 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(link.path)
                    ? "text-teal-400 bg-white/10"
                    : "text-gray-200 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {/* Code Editor (mobile view) */}
            {user && (
              <Link
                to="/code-editor" // Corrected path
                className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 
                                  hover:from-emerald-700 hover:to-cyan-700 rounded-lg transition-all duration-200 
                                  shadow-md hover:shadow-emerald-500/30 w-fit"
                onClick={() => setIsMenuOpen(false)}
              >
                {/* --- 3. REMOVED ICON from mobile too for consistency --- */}
                <span>Coding IDE</span>
              </Link>
            )}

            {/* --- 4. MODIFIED Auth Section (Mobile) --- */}
            {user ? (
              <>
                {/* Added Dashboard/User link for mobile */}
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "text-teal-400 bg-white/10"
                      : "text-gray-200 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5 text-teal-400" />
                  <span>{user.username.toUpperCase()}</span>
                </Link>

                {/* Mobile Logout Button */}
                <form className="m-0" onSubmit={handleLogout}>
                  <button
                    type="submit"
                    disabled={isLoggingOut}
                    className="w-full flex justify-center items-center space-x-1 px-3 py-2 bg-gradient-to-r 
                                from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 
                                rounded-lg transition-all duration-200 shadow-md hover:shadow-teal-500/30 disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Logout"
                    )}
                  </button>
                </form>
              </>
            ) : (
              // Mobile Login Link
              <Link
                to="/login"
                className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 
                                  hover:from-teal-700 hover:to-cyan-700 rounded-lg transition-all duration-200 
                                  shadow-md hover:shadow-teal-500/30 w-fit"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;