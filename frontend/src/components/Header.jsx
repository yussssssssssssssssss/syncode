import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [user, setUser] = useState({ username: "", email: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef();

  useEffect(() => {
    // Fetch user details on mount
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.username) setUser({ username: data.username, email: data.email });
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
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
          {user.username.charAt(0).toUpperCase() || "U"}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-md rounded-lg z-10">
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
