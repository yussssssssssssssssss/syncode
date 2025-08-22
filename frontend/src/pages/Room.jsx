import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BASE_URL } from "../config";
import Header from "../components/Header";
import CollaborativeEditor from "../components/CollaborativeEditor";

export default function Room() {
  const { id: roomCode } = useParams(); // This is actually the room code, not ID
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to get JWT token from cookies
  const getJWTToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'socketToken') {
        return value;
      }
    }
    return null;
  };

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

        // Get JWT token for Socket.IO authentication
        const token = getJWTToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Initialize Socket.IO connection
        console.log("Initializing Socket.IO connection...");
        const socketInstance = io("http://localhost:3000", {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 10000,
          auth: {
            token: token
          }
        });

        socketInstance.on("connect", () => {
          console.log("✅ Connected to WebSocket server");
          setConnected(true);
          setConnectionError(null);
          
          // Join the room via WebSocket
          console.log("Joining room:", roomCode);
          socketInstance.emit("joinRoom", roomCode);
        });

        socketInstance.on("connect_error", (error) => {
          console.error("❌ Socket.IO connection error:", error);
          setConnectionError(error.message);
          setConnected(false);
        });

        socketInstance.on("disconnect", (reason) => {
          console.log("❌ Disconnected from WebSocket server:", reason);
          setConnected(false);
        });

        socketInstance.on("roomJoined", (data) => {
          console.log("✅ Joined room:", data);
          setUsers(data.participants);
          setUserRole(data.userRole);
        });

        socketInstance.on("userJoined", (data) => {
          console.log("👤 User joined:", data.user);
          setUsers(data.participants);
          setMessages(prev => [...prev, {
            type: "system",
            message: `${data.user.name} joined the room`,
            timestamp: new Date().toISOString()
          }]);
        });

        socketInstance.on("userLeft", (data) => {
          console.log("👋 User left:", data.user);
          setUsers(data.participants);
          setMessages(prev => [...prev, {
            type: "system",
            message: `${data.user.name} left the room`,
            timestamp: new Date().toISOString()
          }]);
        });

        socketInstance.on("chatMessage", (data) => {
          console.log("💬 Chat message received:", data);
          setMessages(prev => [...prev, {
            type: "chat",
            user: data.user,
            message: data.message,
            timestamp: data.timestamp
          }]);
        });

        socketInstance.on("error", (error) => {
          console.error("❌ Socket error:", error);
          setError(error.message);
        });

        setSocket(socketInstance);

      } catch (err) {
        console.error("❌ Room join error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    joinRoom();

    // Cleanup function
    return () => {
      if (socket) {
        console.log("Cleaning up Socket.IO connection...");
        socket.disconnect();
      }
    };
  }, [roomCode, navigate]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && connected) {
      const messageText = newMessage.trim();
      console.log("📤 Sending message:", messageText);
      
      // Add user's own message to local state immediately
      const ownMessage = {
        type: "chat",
        user: {
          id: socket.userId || 'self',
          name: socket.userName || 'You',
          role: userRole
        },
        message: messageText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, ownMessage]);
      
      // Send to server
      socket.emit("chatMessage", messageText);
      setNewMessage("");
    }
  };

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
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Room: {room.code}</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {connectionError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
              Connection Error: {connectionError}
            </div>
          )}
          <p className="text-gray-700">Room Code: <span className="font-mono font-semibold">{room.code}</span></p>
          <p className="text-gray-700 mt-2">Participants: {users.length}</p>
          {userRole && (
            <p className="text-gray-700 mt-1">Your role: <span className="font-semibold capitalize">{userRole}</span></p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Participants List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Participants ({users.length})</h2>
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

            {/* Chat Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Chat</h2>
              <div className="h-64 overflow-y-auto border rounded p-3 mb-4 bg-gray-50">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center mt-8">No messages yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div key={index} className={`p-2 rounded ${
                        msg.type === 'system' 
                          ? 'bg-blue-100 text-blue-800 text-center text-sm' 
                          : 'bg-white border'
                      }`}>
                        {msg.type === 'chat' ? (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">{msg.user.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        ) : (
                          <span>{msg.message}</span>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={connected ? "Type your message..." : "Connecting..."}
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!connected}
                />
                <button
                  type="submit"
                  disabled={!connected || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Collaborative Editor */}
          <div className="lg:col-span-3">
            <CollaborativeEditor 
              socket={socket} 
              roomCode={roomCode} 
              userRole={userRole} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}