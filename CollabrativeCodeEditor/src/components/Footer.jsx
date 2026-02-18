
import React from "react";
import { Mail, Github, Instagram, Twitter, MapPin } from "lucide-react";

const developers = [
  {
    name: "Bhavish Pushkarna",
    email: "bhavish.pushkarna2005@gmail.com",
    github: "https://github.com/Bhavish2005",
    instagram: "https://instagram.com/pushkarnabhavish",
    twitter: "https://twitter.com/Bhavish0",
  },
  {
    name: "Pranav Chaudhary",
    email: "pchaudharywork05@gmail.com",
    github: "",
    instagram: "https://www.instagram.com/pranav_0057/",
    twitter: "",
  },
  {
    name: "Devkaran Singh",
    email: "devkaransingh00000@gmail.com",
    github: "https://github.com/Devkaran-Singh",
    instagram: "https://www.instagram.com/devkaransingh_000",
    twitter: "",
  },
  {
    name: "Shreyash Tripathi",
    email: "tripathishreyash123@gmail.com",
    github: "https://github.com/shreyashtripathi1",
    instagram: "https://www.instagram.com/nicobelix",
    twitter: "",
  },
];

const Footer = () => {
  return (
    <div className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-300 border-t border-slate-800">
      {/* Subtle glowing top divider */}
      <div className="absolute top-0 left-0 w-full h-[1px]  bg-gradient-to-r from-slate-900 via-cyan-600 to-slate-900" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Top Title */}
        <h2 className="text-xl font-bold text-white text-center mb-6">
          Your reviews and feedback are important for{" "}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            FixMate
          </span>{" "}
          to improve.
        </h2>

        {/* Developers Section */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {developers.map((dev, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:bg-slate-800/80 transition"
            >
              <h4 className="text-sm font-semibold text-white mb-2">
                {dev.name}
              </h4>
              <div className="flex justify-center gap-3">
                {/* Email (Always shows) */}
                <a
                  href={`mailto:${dev.email}`}
                  className="hover:text-white"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                </a>

                {/* GitHub (Only shows if dev.github is not "") */}
                {dev.github && (
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                    aria-label="GitHub"
                  >
                    <Github className="w-4 h-4 text-gray-300" />
                  </a>
                )}

                {/* Instagram (Only shows if dev.instagram is not "") */}
                {dev.instagram && (
                  <a
                    href={dev.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4 text-pink-400" />
                  </a>
                )}

                {/* Twitter (Only shows if dev.twitter is not "") */}
                {dev.twitter && (
                  <a
                    href={dev.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-4 h-4 text-sky-400" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Office Section */}
        <div className="mt-8 flex flex-col items-center text-center text-gray-400">
          <p className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-red-400" />
            Thapar Institute of Engineering and Technology Patiala, Punjab, India
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 text-center py-3 text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} FixMate. All Rights Reserved.
        </div>
      </div>
    </div>
  );
};

export default Footer;