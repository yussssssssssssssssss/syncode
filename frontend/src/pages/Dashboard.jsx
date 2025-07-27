import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PopupMenu from "../components/PopupMenu";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return navigate("/login");
    setUser(storedUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateRoom = async () => {
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (data.roomId) navigate(`/room/${data.roomId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = async () => {
    const roomId = prompt("Enter Room ID to join:");
    if (!roomId) return;
    navigate(`/room/${roomId}`);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center">
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
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg shadow-md transition"
        >
          Create Room
        </button>
        <button
          onClick={handleJoinRoom}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg shadow-md transition"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
