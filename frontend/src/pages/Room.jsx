import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BASE_URL } from "../config";
import Header from "../components/Header";
import CollaborativeEditor from "../components/CollaborativeEditor";
import VoiceChat from "../components/VoiceChat";
import { FaCopy, FaCheck } from "react-icons/fa";

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
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to get JWT token from cookies
  

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

        

        // Initialize Socket.IO connection
        console.log("Initializing Socket.IO connection...");
        const socketInstance = io(BASE_URL, {
           withCredentials: true,
           transports: ['websocket', 'polling'],
           timeout: 10000
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <div className="p-6 text-slate-600 dark:text-slate-300">Loading room...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <div className="p-6 text-red-500">Error: {error}</div>
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <div className="p-6">Room not found</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <div className="p-6">
        <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold">Room: <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">{room.code}</span></h1>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(room.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 text-gray-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group relative top-[1px]"
                title="Copy room code"
              >
                {copied ? (
                  <FaCheck className="w-4 h-4 text-emerald-500 animate-bounce" />
                ) : (
                  <FaCopy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {connectionError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
              Connection Error: {connectionError}
            </div>
          )}
          <div className="flex items-center gap-3 group">
            <p className="text-gray-700 dark:text-slate-300">Room Code: 
              <span className="font-mono font-semibold ml-2">{room.code}</span>
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(room.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2 text-gray-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group"
              title="Copy room code"
            >
              {copied ? (
                <FaCheck className="w-4 h-4 text-emerald-500 animate-bounce" />
              ) : (
                <FaCopy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </button>
          </div>
          <p className="text-gray-700 dark:text-slate-300 mt-2">Participants: {users.length}</p>
          {userRole && (
            <p className="text-gray-700 dark:text-slate-300 mt-1">Your role: <span className="font-semibold capitalize">{userRole}</span></p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Participants List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-semibold mb-4">Participants ({users.length})</h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900/40 rounded">
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

            {/* Voice Chat */}
              <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
                <VoiceChat socket={socket} />
              </div>

            {/* Chat Section */}
            <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-semibold mb-4">Chat</h2>
              <div className="h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-3 mb-4 bg-gray-50 dark:bg-slate-900/40">
                {messages.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center mt-8">No messages yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div key={index} className={`p-2 rounded ${
                        msg.type === 'system' 
                          ? 'bg-blue-100 text-blue-800 text-center text-sm' 
                          : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {msg.type === 'chat' ? (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">{msg.user.name}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">
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
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                  disabled={!connected}
                />
                <button
                  type="submit"
                  disabled={!connected || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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