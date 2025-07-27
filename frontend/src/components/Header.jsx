import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";

export default function Header() {
  const [user, setUser] = useState({ username: "", email: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef();

  useEffect(() => {
    // Get user details from localStorage instead of API call
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser({ 
        username: storedUser.username, 
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
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <h2 className="text-xl font-bold">syncode</h2>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="w-10 h-10 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center"
        >
          {user.username?.charAt(0)?.toUpperCase() || "U"}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-md rounded-lg z-10 border">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">{user.email}</div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}