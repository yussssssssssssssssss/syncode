import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL } from "../config";

export default function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/room/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch room");
        const data = await res.json();
        setRoom(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-600">Loading room...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!room) return <div className="p-6">Room not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Room: {room.name}</h1>
      <p className="text-gray-700">Room ID: {room._id}</p>
      <p className="text-gray-700 mt-2">Participants: {room.participants?.length || 0}</p>
      {/* You can add a chat, code editor, or room controls here later */}
    </div>
  );
}