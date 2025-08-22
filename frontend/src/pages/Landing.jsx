
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaBolt, FaLock, FaPalette, FaRocket } from "./LandingIcons";

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 flex flex-col items-center justify-center px-4 animate-fadeIn relative overflow-x-hidden">
      {/* Glassmorphism Glow */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-700/30 via-emerald-500/10 to-transparent blur-3xl z-0" />
      <header className="mb-10 z-10 flex flex-col items-center w-full">
        <div className="flex flex-col items-center w-full">
          <h1 className="relative text-center select-none">
            <span className="block text-3xl md:text-4xl font-bold text-blue-400/90 animate-fadeIn tracking-wide" style={{animationDelay:'0.1s'}}>Welcome to</span>
            <div className="relative mt-4">
              <span className="absolute -inset-x-20 -inset-y-8 bg-gradient-to-r from-blue-600/20 via-emerald-600/20 to-blue-600/20 blur-xl animate-pulse"></span>
              <span className="relative block text-[3em] md:text-[4em] leading-none font-black bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(16,185,129,0.35)] animate-gradientMove" style={{letterSpacing:'-0.02em'}}>
                SyncCode
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6 animate-fadeIn" style={{animationDelay:'0.8s'}}>
              <span className="w-12 h-1 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"></span>
              <span className="text-slate-400 text-lg font-medium">Collaborate in Real-time</span>
              <span className="w-12 h-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full"></span>
            </div>
          </h1>
          <p className="text-2xl md:text-3xl text-slate-200 max-w-2xl mx-auto animate-fadeIn delay-300 font-medium text-center mt-6">
            Real-time collaborative coding.<br />
            <span className="text-emerald-400">Seamless teamwork.</span> <span className="text-blue-400">Effortless creation.</span>
          </p>
        </div>
      </header>
      <div className="flex gap-8 mb-16 animate-fadeIn delay-400 z-10">
        <button
          onClick={() => navigate("/register")}
          className="px-10 py-4 rounded-2xl text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 shadow-xl text-white hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-400 backdrop-blur-lg"
        >
          Get Started
        </button>
        <button
          onClick={() => navigate("/login")}
          className="px-10 py-4 rounded-2xl text-2xl font-bold bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-xl text-white hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 backdrop-blur-lg"
        >
          Login
        </button>
      </div>
      {/* Features Section */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 z-10">
        <div className="rounded-3xl bg-slate-800/70 p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-lg animate-fadeIn delay-600">
          <FaBolt className="text-4xl text-emerald-400 mb-3 animate-pulse" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Lightning-fast Collaboration</h2>
          <p className="text-lg text-slate-300">Work together in real-time with zero lag and instant updates.</p>
        </div>
        <div className="rounded-3xl bg-slate-800/70 p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-lg animate-fadeIn delay-700">
          <FaLock className="text-4xl text-blue-400 mb-3 animate-fadeIn" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Private & Secure Rooms</h2>
          <p className="text-lg text-slate-300">Your code and sessions are always protected and private to your team.</p>
        </div>
        <div className="rounded-3xl bg-slate-800/70 p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-lg animate-fadeIn delay-800">
          <FaPalette className="text-4xl text-emerald-400 mb-3 animate-fadeIn" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Modern, Beautiful UI</h2>
          <p className="text-lg text-slate-300">Enjoy a stunning dark interface with smooth transitions and glassmorphism.</p>
        </div>
        <div className="rounded-3xl bg-slate-800/70 p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-lg animate-fadeIn delay-900">
          <FaUsers className="text-4xl text-blue-400 mb-3 animate-fadeIn" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Effortless Team Onboarding</h2>
          <p className="text-lg text-slate-300">Create or join a room in seconds. No setup, just code together.</p>
        </div>
      </div>
      {/* Call to Action */}
      <div className="flex flex-col items-center mt-8 z-10 animate-fadeIn delay-1000">
        <FaRocket className="text-5xl text-emerald-400 mb-2 animate-bounce" />
        <span className="text-xl text-slate-200 font-semibold">Ready to boost your productivity?</span>
      </div>
      <footer className="mt-20 text-slate-500 animate-fadeIn delay-1200 z-10">
        &copy; {new Date().getFullYear()} Syncode. All rights reserved.
      </footer>
    </div>
  );
}
