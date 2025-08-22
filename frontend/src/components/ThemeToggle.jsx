import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.dataset.theme = 'dark';
    } else {
      root.classList.remove('dark');
      root.dataset.theme = 'light';
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {}

    // Notify listeners (e.g., editor) of theme change
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-9 w-16 items-center rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 p-1 transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      <span
        className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white text-slate-700 shadow transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          // Moon icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21.752 15.002A9.718 9.718 0 0112 22C6.477 22 2 17.523 2 12a9.718 9.718 0 016.998-9.752.75.75 0 01.853 1.06A8.219 8.219 0 008.75 6.75C8.75 11.306 12.694 15.25 17.25 15.25c1.786 0 3.44-.53 4.942-1.499a.75.75 0 01.06 1.251z" />
          </svg>
        ) : (
          // Sun icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
            <path fillRule="evenodd" d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.222 4.222a1 1 0 011.414 0L6.343 4.93a1 1 0 11-1.414 1.414L4.222 5.636a1 1 0 010-1.414zM17.657 17.657a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm17-1a1 1 0 100 2h1a1 1 0 100-2h-1zM4.222 18.364a1 1 0 010-1.414L4.93 16.243a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM17.657 6.343a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </button>
  );
}


