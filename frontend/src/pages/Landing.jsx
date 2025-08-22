
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function usePrefersDark() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  return [isDark, setIsDark];
}

export default function Landing() {
  const navigate = useNavigate();
  const [dark, setDark] = usePrefersDark();
  const heroRef = useRef(null);

  useEffect(() => {
    // subtle entrance for elements
    const el = heroRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll('[data-animate]');
    nodes.forEach((n, i) => {
      n.style.opacity = '0';
      n.style.transform = 'translateY(18px)';
      n.style.transition = `opacity 520ms cubic-bezier(.2,.9,.2,1) ${i * 120}ms, transform 520ms cubic-bezier(.2,.9,.2,1) ${i * 120}ms`;
      requestAnimationFrame(() => {
        n.style.opacity = '1'; n.style.transform = 'translateY(0)';
      });
    });
  }, []);

  // ripple effect for CTA
  const ripple = (e) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${e.clientX - rect.left - size/2}px`;
    circle.style.top = `${e.clientY - rect.top - size/2}px`;
    circle.className = 'ripple';
    btn.appendChild(circle);
    setTimeout(() => { circle.remove(); }, 600);
  };

  const startConversation = (e) => {
    ripple(e);
    // smooth scroll to features or open chat modal — for now scroll to features
    const features = document.getElementById('features');
    if (features) features.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else navigate('/login');
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-landing-dark dark:bg-landing-dark py-12 transition-colors duration-500">
      {/* animated background layers */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#04263b] via-[#06323f] to-transparent opacity-80 animate-blob mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#021422] via-[#022e2d] to-[#01203b] opacity-60 animate-bgShift"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex items-center justify-between py-6" data-animate>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-emerald-400 shadow-lg flex items-center justify-center text-white font-bold" aria-hidden>SS</div>
            <div className="text-slate-200 dark:text-slate-100 font-semibold text-lg">ShadowSupport</div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDark(d => !d)} className="px-3 py-2 rounded-md bg-white/6 backdrop-blur-sm hover:bg-white/10 transition" title="Toggle theme">
              <span className="sr-only">Toggle theme</span>
              {dark ? 'Dark' : 'Light'}
            </button>
            <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-md bg-white/6 hover:bg-white/10 transition text-slate-100">Sign in</button>
          </div>
        </nav>

        <main className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 py-24">
          <section className="space-y-6" ref={heroRef}>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-slate-100 dark:text-white tracking-tight" data-animate>
              Meet Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-emerald-300">AI Concierge</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl" data-animate>
              Experience the future of customer service with ShadowSupport’s sophisticated AI agent. Fast, secure, and always-on — designed to delight your customers and lighten your support load.
            </p>

            <div className="flex items-center gap-4" data-animate>
              <button
                onClick={startConversation}
                onMouseDown={ripple}
                className="relative overflow-hidden px-6 py-3 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-400 to-emerald-400 text-slate-900 shadow-2xl transform-gpu hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
              >
                Start Conversation
                <span className="absolute -inset-px rounded-xl border border-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
              </button>

              <button onClick={() => { document.getElementById('features')?.scrollIntoView({behavior:'smooth'}); }} className="px-4 py-2 rounded-lg bg-white/6 text-slate-200 hover:bg-white/10 transition">
                Learn More
              </button>
            </div>
          </section>

          <aside className="flex items-center justify-center">
            <div className="w-full max-w-md p-8 rounded-3xl bg-gradient-to-br from-white/3 to-transparent backdrop-blur-2xl border border-white/6">
              <div className="text-slate-100 mb-4">
                <div className="text-sm uppercase text-emerald-300 tracking-wider">Live Demo</div>
                <div className="mt-3 text-lg font-semibold">Instant replies • Multilingual • Context-aware</div>
              </div>
              <div className="bg-black/40 rounded-xl p-4 text-slate-300">
                <div className="text-sm opacity-80">You: How do I change my subscription?</div>
                <div className="mt-2 text-slate-100 font-medium">ShadowSupport: To update your plan, go to Settings → Billing. Would you like me to open that for you?</div>
              </div>
            </div>
          </aside>
        </main>

        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12" data-animate>
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-lg font-semibold text-white">Always Available</h3>
            <p className="text-sm text-slate-300 mt-2">Provide 24/7 support with intelligent routing and escalation.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-lg font-semibold text-white">Secure by Design</h3>
            <p className="text-sm text-slate-300 mt-2">End-to-end encryption and strict access controls keep data safe.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-lg font-semibold text-white">Seamless Integrations</h3>
            <p className="text-sm text-slate-300 mt-2">Connect to your CRM, helpdesk, and knowledge bases in minutes.</p>
          </div>
        </section>

        <footer className="py-12 text-center text-sm text-slate-400">© {new Date().getFullYear()} ShadowSupport — Crafted with care.</footer>
      </div>

      {/* ripple style */}
      <style>{`
        .ripple{ position: absolute; border-radius: 50%; background: rgba(255,255,255,0.18); transform: scale(0); animation: ripple 600ms linear; pointer-events:none; }
        @keyframes ripple{ to { transform: scale(2.5); opacity:0; } }
        .animate-blob{ animation: blob 10s infinite; }
        @keyframes blob{ 0%{ transform: translate(0px,0px) scale(1); } 33%{ transform: translate(20px,-10px) scale(1.05);} 66%{ transform: translate(-20px,10px) scale(0.95);} 100%{ transform: translate(0px,0px) scale(1);} }
        .animate-bgShift{ background-size: 300% 300%; animation: bgShift 12s ease infinite; }
        @keyframes bgShift { 0%{ background-position:0% 50% } 50%{ background-position:100% 50% } 100%{ background-position:0% 50% } }
        .bg-landing-dark{ background: radial-gradient(1200px 600px at 10% 10%, rgba(4,38,59,0.55), transparent 20%), radial-gradient(900px 400px at 80% 80%, rgba(2,46,47,0.35), transparent 20%), linear-gradient(180deg,#001429,#022631); }
      `}</style>
    </div>
  );
}
