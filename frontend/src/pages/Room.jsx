// src/pages/Room.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import Header from "../components/Header";
import CollaborativeEditor from "../components/CollaborativeEditor";
import VoiceChat from "../components/VoiceChat";
import { socket } from "../socket"; // ✅ use the singleton
import { FaCopy, FaCheck } from "react-icons/fa";

export default function Room() {
  const { id: roomCodeParam } = useParams(); // URL param is the room code
  const roomCode = (roomCodeParam || "").toUpperCase();

  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userRole, setUserRole] = useState(null);

  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    // Require login
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
      return;
    }
    if (!roomCode) {
      setError("Invalid room code");
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        // REST: join the room (adds you as participant if needed)
        const joinRes = await fetch(`${BASE_URL}/api/room/join`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: roomCode }),
        });
        if (!joinRes.ok) throw new Error("Failed to join room");
        const joinData = await joinRes.json();
        if (!isMounted) return;

        setRoom(joinData.room);

        // REST: get participants list
        const usersRes = await fetch(`${BASE_URL}/api/room/${joinData.room.id}/users`, {
          credentials: "include",
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (!isMounted) return;
          setUsers(usersData.users || []);
        }

        // WS: set up global socket handlers once per room
        const onConnect = () => {
          setConnected(true);
          setConnectionError(null);
          // Join the logical Socket.IO room for this code editor session
          socket.emit("joinRoom", roomCode);
        };
        const onConnectError = (err) => {
          setConnected(false);
          setConnectionError(err?.message || "Socket connection error");
        };
        const onDisconnect = () => {
          setConnected(false);
        };

        const onRoomJoined = (data) => {
          setUsers(data.participants || []);
          setUserRole(data.userRole || null);
        };

        const onUserJoined = (data) => {
          setUsers(data.participants || []);
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              message: `${data.user.name} joined the room`,
              timestamp: new Date().toISOString(),
            },
          ]);
        };

        const onUserLeft = (data) => {
          setUsers(data.participants || []);
          setMessages((prev) => [
            ...prev,
            {
              type: "system",
              message: `${data.user.name} left the room`,
              timestamp: new Date().toISOString(),
            },
          ]);
        };

        const onChatMessage = (data) => {
          setMessages((prev) => [
            ...prev,
            {
              type: "chat",
              user: data.user,
              message: data.message,
              timestamp: data.timestamp,
            },
          ]);
        };

        const onError = (e) => {
          setError(e?.message || "Socket error");
        };

        // attach
        socket.on("connect", onConnect);
        socket.on("connect_error", onConnectError);
        socket.on("disconnect", onDisconnect);
        socket.on("roomJoined", onRoomJoined);
        socket.on("userJoined", onUserJoined);
        socket.on("userLeft", onUserLeft);
        socket.on("chatMessage", onChatMessage);
        socket.on("error", onError);

        // if already connected (navigation within app), fire join immediately
        if (socket.connected) {
          onConnect();
        }

        setLoading(false);

        // cleanup: leave this room; keep the socket for the whole app
        return () => {
          isMounted = false;
          try {
            socket.emit("voice:leave", { roomCode }); // ensure voice is left too
            socket.emit("voice:mute", { roomCode, muted: true });
            socket.emit("chatMessage", "[left the room]");
          } catch {}
          socket.off("connect", onConnect);
          socket.off("connect_error", onConnectError);
          socket.off("disconnect", onDisconnect);
          socket.off("roomJoined", onRoomJoined);
          socket.off("userJoined", onUserJoined);
          socket.off("userLeft", onUserLeft);
          socket.off("chatMessage", onChatMessage);
          socket.off("error", onError);
          // Do NOT socket.disconnect() here—let the app keep one persistent socket.
        };
      } catch (err) {
        setError(err.message || "Failed to load room");
        setLoading(false);
      }
    })();
  }, [roomCode, navigate]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !connected) return;

    const messageText = newMessage.trim();
    // optimistic UI
    setMessages((prev) => [
      ...prev,
      {
        type: "chat",
        user: { id: "self", name: "You", role: userRole },
        message: messageText,
        timestamp: new Date().toISOString(),
      },
    ]);
    socket.emit("chatMessage", messageText);
    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <Header />
        <div className="p-6 text-slate-600 dark:text-slate-300">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <Header />
        <div className="p-6 text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
        <Header />
        <div className="p-6">Room not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header />
      <div className="p-6">
        <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold">
                Room:{" "}
                <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  {room.code}
                </span>
              </h1>
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
              <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {connectionError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
              Connection Error: {connectionError}
            </div>
          )}

          <div className="flex items-center gap-3 group">
            <p className="text-gray-700 dark:text-slate-300">
              Room Code: <span className="font-mono font-semibold ml-2">{room.code}</span>
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
            <p className="text-gray-700 dark:text-slate-300 mt-1">
              Your role: <span className="font-semibold capitalize">{userRole}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Participants */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-semibold mb-4">Participants ({users.length})</h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900/40 rounded"
                  >
                    <span className="font-medium">{user.name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.role === "organiser"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-700 transition-colors">
              {/* ✅ Voice needs the same singleton socket and the same roomCode */}
              <VoiceChat socket={socket} roomCode={roomCode} />
            </div>

            {/* Chat */}
            <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-lg font-semibold mb-4">Chat</h2>
              <div className="h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-3 mb-4 bg-gray-50 dark:bg-slate-900/40">
                {messages.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-400 text-center mt-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          msg.type === "system"
                            ? "bg-blue-100 text-blue-800 text-center text-sm"
                            : "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {msg.type === "chat" ? (
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

          {/* Editor */}
          <div className="lg:col-span-3">
            <CollaborativeEditor socket={socket} roomCode={roomCode} userRole={userRole} />
          </div>
        </div>
      </div>
    </div>
  );
}
