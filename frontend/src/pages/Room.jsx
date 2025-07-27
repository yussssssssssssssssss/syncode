import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import Header from "../components/Header";

export default function Room() {
  const { id: roomCode } = useParams(); // This is actually the room code, not ID
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
      return;
    }

    const joinRoom = async () => {
      try {
        // First, try to join the room with the code
        const joinRes = await fetch(`${BASE_URL}/api/room/join`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: roomCode }),
        });

        if (!joinRes.ok) {
          throw new Error("Failed to join room");
        }

        const joinData = await joinRes.json();
        setRoom(joinData.room);

        // Then fetch the users in the room
        const usersRes = await fetch(`${BASE_URL}/api/room/${joinData.room.id}/users`, {
          credentials: "include",
        });

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    joinRoom();
  }, [roomCode, navigate]);

  if (loading) return (
    <div className="min-h-screen">
      <Header />
      <div className="p-6 text-gray-600">Loading room...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen">
      <Header />
      <div className="p-6 text-red-500">Error: {error}</div>
    </div>
  );

  if (!room) return (
    <div className="min-h-screen">
      <Header />
      <div className="p-6">Room not found</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Room: {room.code}</h1>
          <p className="text-gray-700">Room Code: <span className="font-mono font-semibold">{room.code}</span></p>
          <p className="text-gray-700 mt-2">Participants: {users.length}</p>
        </div>

        {/* Participants List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{user.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  user.role === 'organiser' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Collaborative Editor</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
            Code editor will be implemented here
          </div>
        </div>
      </div>
    </div>
  );
}