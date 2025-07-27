import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function Room() {
  const { id } = useParams();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchRoomData = async () => {
      const res = await fetch(`/api/room/${id}`);
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else alert("Failed to load room");
    };
    fetchRoomData();
  }, [id]);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">syncode</h1>
        <div className="bg-pink-200 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">M</div>
      </div>

      <h2 className="text-2xl font-bold mb-2">{users.join(" and ")}</h2>
      <p className="mb-6 text-gray-600">The above is from the database → the users associated with the room will be displayed</p>

      <div className="border-2 border-pink-400 p-4 rounded bg-pink-100">
        <h3 className="font-semibold mb-2">Sample code</h3>
        <code className="block mb-2">// your sample code here</code>
        <button className="bg-pink-400 text-white px-4 py-2 rounded">Copy Code</button>
      </div>
    </div>
  );
}

export default Room;
