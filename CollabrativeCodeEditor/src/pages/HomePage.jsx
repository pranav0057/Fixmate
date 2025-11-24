
import React, { useEffect, useState } from "react";
import {
  Code2,
  MessageCircle,
  Video,
  Plus,
  UserPlus,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Sigma,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const HomeSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 animate-pulse">
        
        {/* Left side skeleton */}
        <div className="space-y-6">
          <div className="h-10 w-56 bg-slate-700 rounded-lg"></div>
          <div className="h-6 w-72 bg-slate-700 rounded"></div>
          <div className="h-4 w-full bg-slate-700 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="h-14 bg-slate-700 rounded-xl"></div>
            <div className="h-14 bg-slate-700 rounded-xl"></div>
            <div className="h-14 bg-slate-700 rounded-xl"></div>
            <div className="h-14 bg-slate-700 rounded-xl"></div>
          </div>
        </div>

        {/* Right side GIF placeholder */}
        <div className="hidden md:block">
          <div className="w-full h-80 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
if (loading) {
  return (
    <div>
      <HomeSkeleton />
    </div>
  );
}

  useEffect(() => {
    // If user is logged in, pre-fill their name
    if (user && user.name) {
      setName(user.name);
    }
  }, [user]);

  const createRoom = () => {
    if (!name.trim()) {
      toast.error("Please enter your name first!");
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${newRoomId}?name=${encodeURIComponent(name)}`);
  };

  const joinRoom = () => {
    if (!name.trim() || !roomId.trim()) {
      toast.error("Please enter your name and room ID!");
      return;
    }
    navigate(
      `/room/${roomId.trim().toUpperCase()}?name=${encodeURIComponent(name)}`
    );
  };

  const features = [
    {
      icon: <Code2 className="w-8 h-8" />,
      title: "Collaborative Editor",
      description:
        "Real-time code editing with syntax highlighting for multiple programming languages. Watch changes happen live as your team codes together.",
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Integrated Chat",
      description:
        "Built-in messaging system to discuss ideas, share links, and communicate without leaving your coding environment.",
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: "Video Conferencing",
      description:
        "High-quality video calls integrated directly into your coding session. See your teammates and discuss code face-to-face.",
    },
    {
      icon: <Sigma className="w-8 h-8 text-purple-400" />, // Gave it a distinct color
      title: "Boost Personal Growth",
      description:
        "Track your coding journey and learn from mistakes. Our editor believes: Σ(Errors + Fixes) = Better Programmer.",
    },
  ];

  const additionalFeatures = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Optimized for speed with real-time synchronization",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "End-to-end encryption for all your code and communications",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Access",
      description: "Code from anywhere with anyone, anytime",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* --- 1. Changed to a 2-column grid --- */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 grid md:grid-cols-2 gap-12 items-center">
          
          {/* --- 2. Left Column (Text & Actions) --- */}
          <div className="text-center md:text-left">
            {/* Removed the Code2 Icon */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                FixMate
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-mono">
              Code. Collaborate. Compile.
            </p>

            {/* --- 3. New, more descriptive paragraph --- */}
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto md:mx-0">
              Unleash your team's potential with a real-time editor built for
              speed. Go from idea to deployment in one space with integrated
              video, chat, and our AI-powered debugger.
            </p>

            {/* --- 4. Moved Conditional Action Layout here --- */}
            {!loading && !user ? (
              // --- GRID LAYOUT (Logged Out) ---
              <div className="max-w-2xl mx-auto md:mx-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-white placeholder-gray-400 font-mono"
                />
                <button
                  onClick={createRoom}
                  className="w-full group flex items-center justify-center space-x-2 px-8 py-4 bg-teal-700 hover:bg-teal-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/25 transform hover:-translate-y-1"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create Room</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  className="w-full px-4 py-4 bg-slate-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-white placeholder-gray-400 font-mono"
                />
                <button
                  onClick={joinRoom}
                  disabled={!roomId.trim()}
                  className="w-full group flex items-center justify-center space-x-2 px-8 py-4 bg-cyan-700 hover:bg-cyan-800 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:-translate-y-1 disabled:transform-none"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">Join Room</span>
                </button>
              </div>
            ) : (
              // --- ORIGINAL FLEX LAYOUT (Logged In) ---
              <div className="flex flex-col sm:flex-row gap-6 items-center mb-16">
                <button
                  onClick={createRoom}
                  className="group flex items-center space-x-2 px-8 py-4 bg-teal-700 hover:bg-teal-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/25 transform hover:-translate-y-1 hover: cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create Room</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    className="px-4 py-4 bg-slate-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-white placeholder-gray-400 font-mono"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!roomId.trim()}
                    className="group flex items-center space-x-2 px-8 py-4 bg-cyan-700 hover:bg-cyan-800 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:-translate-y-1 disabled:transform-none hover: cursor-pointer"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span className="font-medium">Join Room</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* --- 5. Right Column (GIF) --- */}
          <div className="hidden md:block">
            <img
             
              src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3pjYXFveGVqdTk2dmxwYWFpcmVzMWc3MzFzN2FtZXc1b3ZhZmk4NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Jqy5D7DFs0i5EPkWfV/giphy.gif"
              alt="Coding collaboration"
              className="w-full h-auto object-cover "
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className=" relative py-20">
        <div className="absolute top-0 left-0 w-full h-[1px]  bg-gradient-to-r from-slate-900 via-cyan-600 to-slate-900" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Everything you need to{" "}
              <span className="text-teal-400">code together</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Powerful features designed for seamless collaboration and
              productive coding sessions
            </p>
          </div>

          {/* 2x2 Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group h-full border border-gray-700 rounded-2xl p-8 hover:border-gray-500 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`mb-6 group-hover:scale-110 transition-transform duration-300 ${
                    feature.title === "Boost Personal Growth"
                      ? "text-purple-400"
                      : "text-teal-400"
                  }`}
                >
                  {feature.icon}
                </div>
                <h3
                  className={`text-xl font-bold mb-4 ${
                    feature.title === "Boost Personal Growth"
                      ? "text-purple-300"
                      : "text-white"
                  }`}
                >
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-6 border border-gray-700 rounded-xl hover:border-gray-500 transition-all duration-500  hover:shadow-xl"
              >
                <div className="text-emerald-400 flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- EDITED: CTA Section --- */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Experience Our{" "}
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              AI-Powered VIM Editor
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Go beyond collaboration. Track your progress, debug with AI, and
            master your craft with a professional-grade editor built for personal
            growth.
          </p>
          <button
            onClick={() => navigate("/code-editor")}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-1 text-lg font-medium"
          >
            <span>Try the Editor</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
      {/* --- END OF EDIT --- */}
    </div>
  );
};

export default HomePage;