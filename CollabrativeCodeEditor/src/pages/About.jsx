import React from "react";
import {
  Github,
  Instagram,
  Mail,
  Users,
  BrainCircuit,
  Keyboard,
  GitCommitHorizontal,
  Sigma, // 1. Imported Sigma icon
} from "lucide-react";

// Developer data remains the same
const developers = [
  {
    name: "Bhavish Pushkarna ",
    stack: "React, Node.js, Tailwind, Express, MongoDB,Socket.io",
    age: 20,
    gender: "Male",
    imageUrl: "https://placehold.co/100x100/7dd3fc/0f172a?text=BP&font=roboto",
    github: "https://github.com/Bhavish2005",
    instagram: "https://instagram.com/pushkarnabhavish",
    email: "mailto:bhavish.pushkarna2005@gmail.com",
  },
  {
    name: "Pranav Chaudhary",
    stack: "React, Node.js, Express, Socket.io",
    age: 20,
    gender: "Male",
    imageUrl: "https://placehold.co/100x100/a78bfa/0f172a?text=PC&font=roboto",
    github: "",
    instagram: "https://www.instagram.com/pranav_0057/",
    email: "mailto:pchaudharywork05@gmail.com",
  },
  {
    name: "Devkaran Singh",
    stack: "React,MongoDB,Node.js",
    age: 20,
    gender: "Male",
    imageUrl: "https://placehold.co/100x100/6ee7b7/0f172a?text=DS&font=roboto",
    github: "https://github.com/Devkaran-Singh",
    instagram: "https://www.instagram.com/devkaransingh_000",
    email: "mailto:devkaransingh00000@gmail.com",
  },
  {
    name: "Shreyas Tripathi",
    stack: "Full Stack (MERN)",
    age: 20,
    gender: "Male",
    imageUrl: "https://placehold.co/100x100/f87171/0f172a?text=ST&font=roboto",
    github: "https://github.com/shreyashtripathi1",
    instagram: "https://www.instagram.com/nicobelix",
    email: "mailto:tripathishreyash123@gmail.com",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center px-6 py-16">
      {/* --- Section 1: Our Mission (REVISED) --- */}
      <section className="max-w-3xl w-full text-center mb-20 bg-gradient-to-br from-slate-800 to-slate-900 p-10 border border-slate-700 rounded-2xl shadow-xl">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent text-center mb-6">
          Our Mission: Build as One
        </h1>
        <p className="text-lg text-gray-300 leading-relaxed">
          We are building the single, frictionless environment where developers
          can truly build as one. No more juggling tools—just pure, intelligent
          collaboration.
        </p>

        {/* --- Decorative Divider --- */}
        <div className="relative my-8">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-800 px-3 text-teal-400">
              <GitCommitHorizontal className="w-6 h-6" />
            </span>
          </div>
        </div>

        {/* --- Summary Paragraph (MOVED) --- */}
        <p className="text-lg text-gray-400 leading-relaxed">
          Whether you're collaborating remotely, hosting coding sessions, or
          working on open-source projects, our editor is designed to keep you
          connected and productive.
        </p>
      </section>

      {/* --- Section 2: Philosophy & Features --- */}
      <section className="max-w-6xl w-full">
        <div className="space-y-16">
          {/* Point 1: AI Debugger */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 p-6 bg-gray-800 border border-cyan-500/30 rounded-full shadow-lg">
              <BrainCircuit className="w-16 h-16 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3 text-cyan-300">
                Intelligent Debugging, Instantly
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Our platform is supercharged by an{" "}
                <strong>AI-powered debugger</strong> that helps find and fix
                complex issues in record time.
                <br />
                <strong className="text-gray-100 block mt-2">
                  Perfect for:
                </strong>{" "}
                Students and bootcamp graduates tackling new challenges.
              </p>
            </div>
          </div>

          {/* Point 2: Vim + Pro Tools */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 p-6 bg-gray-800 border border-teal-500/30 rounded-full shadow-lg">
              <Keyboard className="w-16 h-16 text-teal-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3 text-teal-300">
                Code at the Speed of Thought
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                We combine robust <strong>multi-language support</strong> with
                advanced tools for professionals, including a fully-integrated,
                zero-latency <strong>Vim mode</strong>.
                <br />
                <strong className="text-gray-100 block mt-2">
                  Built for:
                </strong>{" "}
                Seasoned developers and open-source contributors who demand
                precision.
              </p>
            </div>
          </div>

          {/* Point 3: Collaboration */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 p-6 bg-gray-800 border border-emerald-500/30 rounded-full shadow-lg">
              <Users className="w-16 h-16 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3 text-emerald-300">
                Collaboration Without Compromise
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Go beyond simple text sharing. Our editor provides{" "}
                <strong>live cursors, shared terminals, and integrated video</strong>
                , creating a true pair-programming environment.
                <br />
                <strong className="text-gray-100 block mt-2">
                  Ideal for:
                </strong>{" "}
                Remote-first companies and distributed teams bridging the distance.
              </p>
            </div>
          </div>

          {/* --- 2. ADDED: New Point 4 --- */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 p-6 bg-gray-800 border border-purple-500/30 rounded-full shadow-lg">
              <Sigma className="w-16 h-16 text-purple-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3 text-purple-300">
                Boost Your Personal Growth
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Track your coding journey with a boosted personal editor. We
                believe that errors are just stepping stones to mastery. Our
                platform helps you analyze your mistakes, because we know:
              </p>
              <p className="font-mono text-lg text-purple-300 bg-gray-800 p-3 rounded-lg mt-3 inline-block">
                &Sigma;(More Errors + More Fixes) = A Better Programmer
              </p>
              <br />
              <strong className="text-gray-100 block mt-2">
                Designed for:
              </strong>{" "}
              <p className="text-lg text-gray-300 leading-relaxed">
                {" "}
                Solo learners and students focused on self-improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section 3: Meet the Team --- */}
      <section className="max-w-6xl w-full mt-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Meet the Team
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {developers.map((dev) => (
            <div
              key={dev.name}
              className="group flex items-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:bg-slate-700"
            >
              {/* Circular Photo with Hover Effect */}
              <img
                src={dev.imageUrl}
                alt={dev.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-hover:ring-teal-400 group-hover:border-transparent"
              />

              {/* Developer Info */}
              <div className="ml-6 flex-1">
                <h3 className="text-2xl font-bold text-gray-100 transition-colors duration-300 group-hover:text-teal-300">
                  {dev.name}
                </h3>
                <p className="text-sm text-teal-400 font-mono tracking-wide">
                  {dev.stack}
                </p>
                <div className="flex text-gray-400 text-sm mt-2 space-x-4">
                  <span>Age: {dev.age}</span>
                  <span>Gender: {dev.gender}</span>
                </div>

                {/* Social Links - EDITED SECTION */}
                <div className="flex items-center space-x-4 mt-4">
                  {/* GitHub: Only shows if dev.github is not "" */}
                  {dev.github && (
                    <a
                      href={dev.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-teal-400 transition-colors duration-200"
                      title="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}

                  {/* Instagram: Only shows if dev.instagram is not "" */}
                  {dev.instagram && (
                    <a
                      href={dev.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-pink-500 transition-colors duration-200"
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}

                  {/* Email: Only shows if dev.email is not "" */}
                  {dev.email && (
                    <a
                      href={dev.email}
                      className="text-gray-400 hover:text-blue-400 transition-colors duration-200"
                      title="Email"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About;