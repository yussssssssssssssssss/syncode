import React from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen w-full bg-landing-dark dark:bg-gradient-to-br dark:from-[#001429] dark:via-[#022631] dark:to-[#01203b] flex flex-col items-center justify-start relative overflow-x-hidden">
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-transparent border-b border-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-400 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
              SC
            </div>
            <div className="text-white font-semibold text-lg">Syncode</div>
          </div>
          <div />
        </div>
      </header>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-block">
            <div className="relative inline-flex items-center px-6 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-blue-300 text-sm font-medium mb-6">
              <span className="flex w-2 h-2 mx-2">
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400"></span>
              </span>
              Next Generation Collaborative IDE
            </div>
          </div>
          
          <h1 className="relative">
            <span className="block text-4xl md:text-6xl font-bold text-white mb-6 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              Code Together,{' '}
              <span className="relative">
                <span className="absolute -inset-1 bg-emerald-400/20 blur"></span>
                <span className="relative">Seamlessly</span>
              </span>
            </span>
            <span className="block text-2xl md:text-3xl bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent font-medium animate-fadeIn" style={{ animationDelay: '0.4s' }}>
              Real-time collaboration meets AI assistance
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.6s' }}>
            Experience the future of pair programming with low-latency editing, voice chat, and AI-powered code suggestions — all in a beautiful dark interface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
            <button
              onClick={(e) => handleRipple(e, "/register")}
              className="cta-btn group relative w-full sm:w-auto overflow-hidden px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-emerald-400 to-blue-400 text-white shadow-xl hover:scale-[1.02] transition-all duration-300 focus:outline-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <button
              onClick={(e) => handleRipple(e, "/login")}
              className="cta-secondary relative w-full sm:w-auto overflow-hidden px-8 py-4 rounded-xl text-lg font-semibold border border-white/10 text-white hover:bg-white/5 transition-all duration-300 focus:outline-none"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-20">
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400/10 to-blue-400/10 text-emerald-400">
                <FaBolt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">Lightning Fast</h3>
                <p className="text-slate-300">Experience real-time collaboration with zero latency. Your changes appear instantly across all connected sessions.</p>
              </div>
            </div>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/10 to-emerald-400/10 text-blue-400">
                <FaLock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Secure & Private</h3>
                <p className="text-slate-300">End-to-end encryption keeps your code safe. Private rooms with secure tokens ensure complete privacy.</p>
              </div>
            </div>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400/10 to-blue-400/10 text-emerald-400">
                <FaPalette className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">Modern Interface</h3>
                <p className="text-slate-300">A thoughtfully designed dark interface with smooth transitions and delightful micro-interactions.</p>
              </div>
            </div>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/20 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/10 to-emerald-400/10 text-blue-400">
                <FaUsers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">Team Friendly</h3>
                <p className="text-slate-300">Create or join rooms instantly. Perfect for pair programming sessions and team collaborations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative mt-32 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-blue-400/20 to-emerald-400/20 blur-3xl opacity-50"></div>
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Start Coding Together?</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">Join thousands of developers who are already experiencing the future of collaborative coding.</p>
            <button
              onClick={(e) => handleRipple(e, "/register")}
              className="cta-btn group relative inline-flex items-center overflow-hidden px-8 py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-emerald-400 to-blue-400 text-white shadow-xl hover:scale-[1.02] transition-all duration-300 focus:outline-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started Now
                <FaRocket className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
        
        <footer className="text-center py-8 mt-32 text-slate-400 border-t border-white/5">
          <p>&copy; {new Date().getFullYear()} Syncode. All rights reserved.</p>
        </footer>
      </main>

      {/* Ripple effect styles */}
      <style>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 600ms linear;
          background: rgba(255,255,255,0.15);
          pointer-events: none;
        }
        @keyframes ripple { to { transform: scale(4); opacity: 0; } }
      `}</style>
    </div>
  );
}
