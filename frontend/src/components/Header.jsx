import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [user, setUser] = useState({ name: "", email: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef();

  useEffect(() => {
    // Get user details from localStorage instead of API call
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser({ 
        name: storedUser.name, 
        email: storedUser.email 
      });
    } else {
      // If no user in localStorage, redirect to login
      navigate("/login");
    }

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      // Clear localStorage and navigate regardless of API call result
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center transition-colors">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">syncode</span>
      </h2>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-white font-bold flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-transform"
          >
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right animate-in fade-in zoom-in bg-white dark:bg-slate-800 shadow-lg rounded-xl z-10 border border-slate-200 dark:border-slate-700">
              <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">{user.email}</div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-b-xl transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}