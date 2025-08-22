import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PopupMenu from "../components/PopupMenu";
import { BASE_URL } from "../config";
import { FaPlus, FaUsers } from "react-icons/fa";

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
      await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const handleCreateRoom = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/room/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.name }),
      });
      const data = await res.json();
      if (res.ok) {
        const roomPath = data.roomId || data.room?.id || data.room?.code;
        if (roomPath) navigate(`/room/${roomPath}`);
        else alert(data.message || "Room created but no room id returned");
      } else {
        alert(data.message || "Failed to create room");
      }
    } catch (err) {
      console.error("Create room error:", err);
      alert("Failed to create room. Please try again.");
    } finally { setLoading(false); }
  };

  const handleJoinRoom = async () => {
    const roomCode = prompt("Enter Room Code to join:")?.trim().toUpperCase();
    if (!roomCode) return;
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/room/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode }),
      });
      const data = await res.json();
      if (res.ok) navigate(`/room/${data.room.code}`);
      else alert(data.message || "Failed to join room");
    } catch (err) {
      console.error("Join room error:", err);
      alert("Failed to join room. Please check the room code and try again.");
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-landing-dark dark:bg-gradient-to-br dark:from-[#001429] dark:via-[#022631] dark:to-[#01203b] transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-emerald-400 shadow-md flex items-center justify-center text-white font-bold">SS</div>
            <div className="text-white font-semibold">Syncode</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setMenuOpen(p => !p)} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 text-white font-semibold flex items-center justify-center shadow-sm">{user.name?.[0]?.toUpperCase()}</button>
              {menuOpen && (
                <div className="absolute right-0 mt-3 bg-slate-800 rounded-lg shadow-lg p-3 w-48">
                  <div className="text-sm text-slate-200 mb-2">{user.email}</div>
                  <button onClick={handleLogout} className="w-full text-left px-2 py-2 rounded hover:bg-white/6">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <section className="lg:col-span-2 bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/6 shadow-lg">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back, <span className="text-emerald-300">{user.name}</span></h2>
            <p className="text-slate-300 mb-6">Create a room to start collaborating or join an existing session using a code.</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleCreateRoom} disabled={loading} className="glow-btn transform-gpu px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-blue-400 font-semibold text-slate-900 shadow-lg hover:scale-[1.02] transition"> <FaPlus className="inline mr-2"/> Create Room</button>
              <button onClick={handleJoinRoom} disabled={loading} className="px-6 py-3 rounded-xl bg-transparent border border-white/10 text-white hover:bg-white/6 transition"> <FaUsers className="inline mr-2"/> Join Room</button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/3 border border-white/6">
                <h4 className="font-semibold text-white">Realtime Editor</h4>
                <p className="text-sm text-slate-300">Collaborate on code with live updates and cursor presence.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/3 border border-white/6">
                <h4 className="font-semibold text-white">Voice Chat</h4>
                <p className="text-sm text-slate-300">Low-latency audio powered by WebRTC with mute by default.</p>
              </div>
            </div>
          </section>

          {/* Right column was removed to simplify layout and avoid duplicate usage panel */}
        </main>

        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-white font-semibold">Security</h3>
            <p className="text-slate-300 text-sm mt-2">Encrypted sessions, secure tokens, and role-based access.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-white font-semibold">Performance</h3>
            <p className="text-slate-300 text-sm mt-2">Optimized real-time sync for a smooth collaborative experience.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/4 backdrop-blur-md border border-white/6">
            <h3 className="text-white font-semibold">Integrations</h3>
            <p className="text-slate-300 text-sm mt-2">Connect with your favorite tools and services.</p>
          </div>
        </section>

        <footer className="mt-12 text-center text-slate-400">© {new Date().getFullYear()} Syncode — Built for modern teams.</footer>
      </div>
    </div>
  );
}