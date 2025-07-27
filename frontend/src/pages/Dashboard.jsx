import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PopupMenu from "../components/PopupMenu";
import { BASE_URL } from "../config";

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
      const res = await fetch(`${BASE_URL}/api/room/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: user.username }),
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
      const res = await fetch(`${BASE_URL}/api/room/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="relative self-end mb-4">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold hover:opacity-90"
          >
            {user.username?.[0]?.toUpperCase() || "?"}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12">
              <PopupMenu email={user.email} onLogout={handleLogout} />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-800">Welcome, {user.username}!</h1>

        <div className="flex gap-6">
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className={`px-6 py-3 rounded-xl text-lg shadow-md transition ${
              loading 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-green-600 hover:bg-green-700"
            } text-white`}
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className={`px-6 py-3 rounded-xl text-lg shadow-md transition ${
              loading 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}