import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PopupMenu from "../components/PopupMenu";
import { BASE_URL } from "../config";
import { FaPlus, FaSignOutAlt, FaUsers } from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return navigate("/login");
    setUser(storedUser);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear the cookie
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear localStorage and navigate regardless of API call result
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const handleCreateRoom = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // try to include socketToken cookie as Authorization header in case cookie wasn't sent
  const cookies = document.cookie.split(';').reduce((acc, c) => { const [k,v] = c.split('='); acc[k?.trim()] = v; return acc; }, {});
  const storedToken = localStorage.getItem('authToken');
  const authHeader = cookies.socketToken ? `Bearer ${cookies.socketToken}` : (storedToken ? `Bearer ${storedToken}` : null);
      const res = await fetch(`${BASE_URL}/api/room/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ username: user.name }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.roomId) {
        navigate(`/room/${data.roomId}`);
      } else {
        alert(data.message || "Failed to create room");
      }
    } catch (err) {
      console.error("Create room error:", err);
      alert("Failed to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const roomCode = prompt("Enter Room Code to join:")?.trim().toUpperCase();
    if (!roomCode) return;

    if (loading) return;
    
    setLoading(true);
    try {
  const cookies = document.cookie.split(';').reduce((acc, c) => { const [k,v] = c.split('='); acc[k?.trim()] = v; return acc; }, {});
  const storedToken = localStorage.getItem('authToken');
  const authHeader = cookies.socketToken ? `Bearer ${cookies.socketToken}` : (storedToken ? `Bearer ${storedToken}` : null);
      const res = await fetch(`${BASE_URL}/api/room/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ code: roomCode }),
      });
      
      
      const data = await res.json();
      
      if (res.ok) {
        navigate(`/room/${data.room.code}`);
      } else {
        alert(data.message || "Failed to join room");
      }
    } catch (err) {
      console.error("Join room error:", err);
      alert("Failed to join room. Please check the room code and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-emerald-950 transition-colors animate-fadeIn">
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        {/* User Avatar & Menu */}
        <div className="relative self-end mb-8 w-full flex justify-end">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-slate-800"
            aria-label="User menu"
          >
            {user.name?.[0]?.toUpperCase() || "?"}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-14 z-20 animate-fadeIn">
              <PopupMenu email={user.email} onLogout={handleLogout} />
            </div>
          )}
        </div>

        {/* Welcome & Animation */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-slate-100 animate-fadeIn">
          Welcome, <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent animate-gradientMove">{user.name}</span>!
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-10 animate-fadeIn delay-200">
          Ready to collaborate? Create or join a coding room below.
        </p>

        {/* Action Cards */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 animate-fadeIn delay-400">
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className={`group relative px-10 py-8 rounded-3xl text-2xl font-semibold shadow-2xl transition-all duration-300 bg-emerald-700/90 hover:bg-emerald-600 hover:scale-105 text-white flex flex-col items-center gap-3 focus:outline-none focus:ring-4 focus:ring-emerald-400 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className="flex items-center gap-2">
              <FaPlus className="text-3xl group-hover:rotate-90 transition-transform duration-300" />
              Create Room
            </span>
            <span className="text-sm mt-2 text-emerald-200">Start a new collaborative session</span>
            {loading && <span className="absolute top-2 right-4 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className={`group relative px-10 py-8 rounded-3xl text-2xl font-semibold shadow-2xl transition-all duration-300 bg-blue-700/90 hover:bg-blue-600 hover:scale-105 text-white flex flex-col items-center gap-3 focus:outline-none focus:ring-4 focus:ring-blue-400 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className="flex items-center gap-2">
              <FaUsers className="text-3xl group-hover:scale-110 transition-transform duration-300" />
              Join Room
            </span>
            <span className="text-sm mt-2 text-blue-200">Enter a code to join your team</span>
            {loading && <span className="absolute top-2 right-4 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
          </button>
        </div>

        {/* Info Card */}
        <div className="w-full max-w-2xl rounded-3xl bg-slate-800/70 p-8 shadow-2xl animate-fadeIn delay-600">
          <h2 className="text-xl font-bold text-slate-100 mb-3">How it works</h2>
          <ul className="text-base text-slate-300 space-y-2">
            <li className="flex items-center gap-2"><span className="text-emerald-400">•</span> Create a room and share the code with your team</li>
            <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Join a room using a code</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">•</span> Collaborate in real-time with beautiful UI</li>
            <li className="flex items-center gap-2"><span className="text-blue-400">•</span> Enjoy smooth transitions and dark mode</li>
          </ul>
        </div>

        <footer className="mt-16 text-slate-500 animate-fadeIn delay-800">
          &copy; {new Date().getFullYear()} Syncode. All rights reserved.
        </footer>
      </div>
    </div>
  );
}