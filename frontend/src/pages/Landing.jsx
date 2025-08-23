import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaBolt, FaLock, FaPalette, FaRocket } from "./LandingIcons";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 flex flex-col items-start overflow-x-hidden">

      {/* Background orbs (pure CSS, respects prefers-reduced-motion) */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute left-[-8%] top-[-8%] w-96 h-96 rounded-full bg-gradient-to-br from-emerald-700/20 to-blue-600/8 blur-3xl opacity-60 motion-reduce:opacity-40" />
        {/* Removed right-side orb to avoid rendering a dark vertical artifact on small viewports */}
      </div>

      <header className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center md:items-start gap-10">
        {/* Left: Hero */}
        <div className="flex-1 text-left">
          <p className="text-emerald-300 font-semibold tracking-wide">Seamless teamwork, Effortless creation</p>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
            Syncode
            <span className="block mt-2 text-emerald-400 text-2xl md:text-3xl font-bold">Real-time collaborative coding</span>
          </h1>

          <p className="mt-4 text-lg text-slate-300 max-w-2xl">Live edits, instant voice, and secure sandboxes — everything synced with near-zero latency. Compile and stream outputs in many languages; nothing persists unless you save.</p>

          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => navigate('/register')}
              aria-label="Get started"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 text-white text-lg font-semibold shadow-lg transition motion-safe:hover:-translate-y-0.5"
            >
              Get started
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/login')}
              aria-label="Login"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-transparent border border-white/10 text-white text-lg font-semibold shadow-sm hover:bg-white/6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10 transition"
            >
              Login
            </button>
          </div>

        </div>

        {/* Right: Mockup */}
        <div className="w-full md:w-96 lg:w-[580px]">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/3 p-1 shadow-2xl">
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-white/6">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 block" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 block" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
                </div>
                <div className="text-xs text-slate-400">SynCode · Live</div>
              </div>
              <div className="p-6 sm:p-8">
                <pre className="h-48 sm:h-56 md:h-64 overflow-auto rounded text-sm font-mono text-slate-300 leading-relaxed bg-gradient-to-b from-slate-900 to-slate-800 p-4">{`// index.js
import express from 'express'
const app = express()
app.listen(3000, () => console.log('ready'))
// ...`}</pre>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white">AL</div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">BR</div>
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">CI</div>
                  </div>
                  <div className="text-xs text-slate-400">Realtime • 3 editors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <article className="rounded-2xl bg-slate-800/60 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-600/10 text-blue-400"><FaUsers className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Voice Chat</h3>
              <p className="text-slate-300">Built-in low-latency voice for every room — talk and collaborate instantly.</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-slate-800/60 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-600/10 text-emerald-400"><FaRocket className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Multilanguage Compiles</h3>
              <p className="text-slate-300">Instant execution and streamed output for many languages — see results live.</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-slate-800/60 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-600/10 text-blue-400"><FaLock className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Secure & Ephemeral</h3>
              <p className="text-slate-300">Ephemeral sandboxes and encrypted transport — nothing saved unless you choose to persist it.</p>
            </div>
          </div>
        </article>
      </section>


      <footer className="w-full text-center py-8 text-slate-500">
        <div className="max-w-6xl mx-auto px-6">&copy; {new Date().getFullYear()} Syncode — Crafted for delightful collaboration.</div>
      </footer>
    </div>
  );
}
