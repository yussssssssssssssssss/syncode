import React from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { FaUsers, FaBolt, FaLock, FaPalette, FaRocket } from "./LandingIcons";

export default function Landing() {
  const navigate = useNavigate();

  // ripple CTA helper
  const handleRipple = (e, to) => {
    const btn = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - (btn.getBoundingClientRect().left + radius)}px`;
    circle.style.top = `${e.clientY - (btn.getBoundingClientRect().top + radius)}px`;
    circle.className = "ripple";
    const ripple = btn.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();
    btn.appendChild(circle);
    setTimeout(() => {
      if (to) navigate(to);
    }, 220);
  };

  return (
    <div className="min-h-screen w-full bg-landing-dark dark:bg-gradient-to-br dark:from-[#001429] dark:via-[#022631] dark:to-[#01203b] flex flex-col items-center justify-start px-4 relative overflow-x-hidden">
      {/* top header */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between py-6 px-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-400 to-emerald-400 shadow-md flex items-center justify-center text-white font-bold">SC</div>
          <div className="text-white font-semibold">Syncode</div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>

      {/* Glassmorphism Glow */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-700/30 via-emerald-500/10 to-transparent blur-3xl z-0" />

      <main className="z-10 w-full max-w-5xl mx-auto text-center py-12">
        <header className="mb-8">
          <h1 className="relative text-center select-none">
            <span className="block text-2xl md:text-3xl font-medium text-blue-300/90 animate-fadeIn">Meet Your AI Concierge</span>
            <div className="relative mt-4">
              <span className="absolute -inset-x-20 -inset-y-8 bg-gradient-to-r from-blue-600/20 via-emerald-600/20 to-blue-600/20 blur-xl animate-pulse"></span>
              <span className="relative block text-[3rem] md:text-[4rem] leading-none font-extrabold bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(16,185,129,0.25)] animate-gradientMove" style={{letterSpacing:'-0.02em'}}>
                Syncode
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6 animate-fadeIn" style={{animationDelay:'0.4s'}}>
              <span className="w-10 h-1 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full" />
              <span className="text-slate-300 text-lg font-medium">Collaborative coding, powered by WebRTC & AI</span>
              <span className="w-10 h-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full" />
            </div>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mt-6">Real-time multiplayer editor, low-latency voice, and fast onboarding — all wrapped in a beautiful dark interface.</p>
        </header>

        <div className="flex gap-6 justify-center mt-8">
          <button
            onClick={(e) => handleRipple(e, "/register")}
            className="cta-btn relative overflow-hidden px-8 py-3 rounded-2xl text-lg font-semibold bg-emerald-400 text-slate-900 shadow-xl hover:scale-105 transition-transform focus:outline-none"
            aria-label="Get Started"
          >
            Get Started
          </button>

          <button
            onClick={(e) => handleRipple(e, "/login")}
            className="cta-secondary relative overflow-hidden px-8 py-3 rounded-2xl text-lg font-semibold bg-transparent border border-white/10 text-white hover:bg-white/6 transition focus:outline-none"
            aria-label="Login"
          >
            Login
          </button>
        </div>

        {/* features grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/6">
            <div className="flex items-center gap-3 mb-3">
              <FaBolt className="text-2xl text-emerald-300" />
              <h3 className="text-lg text-white font-semibold">Lightning Collaboration</h3>
            </div>
            <p className="text-slate-300">Low-latency edits and instant presence make working together feel seamless.</p>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/6">
            <div className="flex items-center gap-3 mb-3">
              <FaLock className="text-2xl text-blue-300" />
              <h3 className="text-lg text-white font-semibold">Private Rooms</h3>
            </div>
            <p className="text-slate-300">Rooms are private by code and protected by secure tokens.</p>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/6">
            <div className="flex items-center gap-3 mb-3">
              <FaPalette className="text-2xl text-emerald-300" />
              <h3 className="text-lg text-white font-semibold">Beautiful UI</h3>
            </div>
            <p className="text-slate-300">Dark-first design, smooth transitions, and thoughtful micro-interactions.</p>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/6">
            <div className="flex items-center gap-3 mb-3">
              <FaUsers className="text-2xl text-blue-300" />
              <h3 className="text-lg text-white font-semibold">Fast Team Setup</h3>
            </div>
            <p className="text-slate-300">Create or join a room in seconds — no friction, just code.</p>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-300">
          <FaRocket className="text-4xl text-emerald-300 inline-block mb-2 animate-bounce" />
          <div className="mt-2">Ready to boost your productivity? Start a session now.</div>
        </div>

        <footer className="mt-16 text-slate-500">&copy; {new Date().getFullYear()} Syncode. All rights reserved.</footer>
      </main>

      {/* ripple styles (scoped) */}
      <style>{`.ripple{position:absolute;border-radius:50%;transform:scale(0);animation:ripple 400ms linear;background:rgba(255,255,255,0.22);pointer-events:none;}
        @keyframes ripple{to{transform:scale(4);opacity:0}}`}</style>
    </div>
  );
}
