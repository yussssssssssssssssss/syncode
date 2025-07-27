import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const email = "your@email.com"; // Replace with actual user session if available

  const createRoom = async () => {
    const res = await fetch("/api/room/create", { method: "POST" });
    const data = await res.json();
    if (res.ok && data.code) navigate(`/room/${data.code}`);
    else alert("Failed to create room");
  };

  const joinRoom = async () => {
    const res = await fetch("/api/room/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode }),
    });
    const data = await res.json();
    if (res.ok && data.code) navigate(`/room/${data.code}`);
    else alert("Invalid room code");
  };

  const logout = async () => {
    await fetch("/api/auth/logout");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="absolute top-4 right-4 relative">
        <button className="bg-pink-200 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">M</button>
        <div className="absolute right-0 mt-2 p-4 bg-red-100 rounded shadow-md">
          <p className="mb-2">{email}</p>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-1 rounded">Logout</button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8">syncode</h1>
      <div className="flex space-x-4 bg-blue-100 p-6 rounded-md">
        <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded">Create Room</button>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Enter Code"
          className="border-2 border-gray-300 px-3 py-2 rounded"
        />
        <button onClick={joinRoom} className="bg-white border-2 border-blue-500 text-blue-500 px-4 py-2 rounded">Join</button>
      </div>
    </div>
  );
}

export default Dashboard;
