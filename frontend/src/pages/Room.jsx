import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BASE_URL } from "../config";
import Header from "../components/Header";
import CollaborativeEditor from "../components/CollaborativeEditor";
import { FaCopy, FaCheck, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

export default function Room() {
  const { id: roomCode } = useParams(); // This is actually the room code, not ID
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [initialSync, setInitialSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userRole, setUserRole] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true); // default everyone muted
  const pcsRef = useRef(new Map()); // map of remoteSocketId -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // map of remoteSocketId -> audio element
  const localStreamRef = useRef(null);
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
        // If cookies are blocked on mobile, try sending socketToken as Authorization header
  const cookies = document.cookie.split(';').reduce((acc, c) => { const [k,v] = c.split('='); acc[k?.trim()] = v; return acc; }, {});
  const storedToken = localStorage.getItem('authToken');
  const authHeader = cookies.socketToken ? `Bearer ${cookies.socketToken}` : (storedToken ? `Bearer ${storedToken}` : null);
        const joinRes = await fetch(`${BASE_URL}/api/room/join`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {})
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
        const socketAuth = {};
        if (authHeader) socketAuth.token = authHeader.replace('Bearer ', '');
        const socketInstance = io(BASE_URL, {
           withCredentials: true,
           transports: ['websocket', 'polling'],
           timeout: 10000,
           auth: socketAuth
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
          // Ensure negotiation: create peers as offerer towards other connected sockets
          try {
            const meId = socketInstance.id;
            data.participants.forEach(p => {
              if (p.socketId && p.socketId !== meId && !pcsRef.current.has(p.socketId)) {
                // Create as offerer so we initiate negotiation
                console.log('Creating peer (offerer) for existing participant', p.socketId);
                const pc = createPeer(p.socketId, socketInstance, true);
                // add our local tracks if available and not muted
                if (localStreamRef.current && !muted) {
                  try { for (const track of localStreamRef.current.getTracks()) pc.addTrack(track, localStreamRef.current); } catch(e){}
                }
              }
            });
          } catch (e) {
            console.error('Error creating initial peers:', e);
          }
        });

        socketInstance.on("userJoined", (data) => {
          console.log("👤 User joined:", data.user);
          // Update users list
          setUsers(data.participants);
          setMessages(prev => [...prev, {
            type: "system",
            message: `${data.user.name} joined the room`,
            timestamp: new Date().toISOString()
          }]);

          // Existing clients should create a peer and be the offerer towards the new user
          try {
            const newUser = data.user;
            const newParticipant = data.participants.find(p => p.id === newUser.id);
            if (newParticipant && newParticipant.socketId && socketInstance && socketInstance.id !== newParticipant.socketId) {
              // if we don't already have a pc for them, create one as offerer
              if (!pcsRef.current.has(newParticipant.socketId)) {
                console.log('Creating offerer peer for new user', newParticipant.socketId);
                const pc = createPeer(newParticipant.socketId, socketInstance, true);
                // if we have a local stream and not muted, add tracks so offer contains our audio
                if (localStreamRef.current && !muted) {
                  try {
                    for (const track of localStreamRef.current.getTracks()) pc.addTrack(track, localStreamRef.current);
                  } catch (e) { console.error('Error adding local tracks to new offerer pc', e); }
                }
              }
            }
          } catch (e) {
            console.error('Error handling userJoined offer creation:', e);
          }
        });

  // (userLeft handled later once) - single handler will update participants and show message

        // WebRTC signaling handlers
    socketInstance.on('webrtc-offer', async ({ from, sdp, fromUserId }) => {
          try {
            console.log('Received offer from', from);
      let pc = pcsRef.current.get(from);
      // create peer as answerer (do NOT auto-create offer)
      if (!pc) pc = createPeer(from, socketInstance, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // If we have local stream (unmuted), add tracks
            if (localStreamRef.current) {
              for (const track of localStreamRef.current.getTracks()) {
                pc.addTrack(track, localStreamRef.current);
              }
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketInstance.emit('webrtc-answer', { target: from, sdp: pc.localDescription });
          } catch (e) {
            console.error('Error handling offer', e);
          }
        });

        socketInstance.on('webrtc-answer', async ({ from, sdp }) => {
          try {
            const pc = pcsRef.current.get(from);
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          } catch (e) {
            console.error('Error handling answer', e);
          }
        });

        socketInstance.on('webrtc-ice', async ({ from, candidate }) => {
          try {
            const pc = pcsRef.current.get(from);
            if (!pc || !candidate) return;
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        });

        socketInstance.on('voice-toggle', ({ socketId, muted: remoteMuted }) => {
          // mark user in users list as muted/unmuted based on socketId
          setUsers(prev => prev.map(u => {
            if (u.socketId === socketId) return { ...u, muted: remoteMuted };
            return u;
          }));
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

        // receive room editor snapshot (server may emit this on join)
        socketInstance.on('codeSync', (data) => {
          try {
            if (data?.roomCode === roomCode) {
              // store initial sync so editor can apply even if its socket handler hasn't mounted yet
              setInitialSync({ code: data.code, language: data.language, theme: data.theme });
            }
          } catch (e) {
            console.error('Error handling codeSync in Room:', e);
          }
        });

        // Ensure we remove participant when page is closed/reloaded
        const handleBeforeUnload = (e) => {
          try {
            if (socketInstance && socketInstance.connected) {
              // best-effort notify server that we're leaving
              socketInstance.emit('leaveRoom');
              // close the socket to trigger server disconnect logic faster
              socketInstance.disconnect();
            }
          } catch (err) {
            // swallow errors during unload
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        // pagehide is more reliable on mobile/browsers
        window.addEventListener('pagehide', handleBeforeUnload);

        // store socket into state so other effects can use it

  setSocket(socketInstance);

        // Cleanup unload listeners when this effect unmounts (socketInstance captured)
        const cleanupUnload = () => {
          try {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleBeforeUnload);
          } catch (e) {}
        };

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
      // Close peer connections and remove audio elements
      pcsRef.current.forEach((pc, id) => {
        try { pc.close(); } catch(e){}
      });
      pcsRef.current.clear();
      audioElsRef.current.forEach((el) => {
        try { el.pause(); el.srcObject = null; el.remove(); } catch(e){}
      });
      audioElsRef.current.clear();
      // stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
  // remove unload handlers if any
  try { cleanupUnload && cleanupUnload(); } catch(e){}
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

  // WebRTC helpers
  const createPeer = (remoteSocketId, socketInstance, isOfferer = false) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pcsRef.current.set(remoteSocketId, pc);

  pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('webrtc-ice', { target: remoteSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      let audioEl = audioElsRef.current.get(remoteSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.srcObject = stream;
        audioElsRef.current.set(remoteSocketId, audioEl);
        // Attach to DOM hidden container so autoplay policies work
        const container = document.getElementById('audio-container');
        if (container) container.appendChild(audioEl);
      } else {
        audioEl.srcObject = stream;
      }
    };

    // Use onnegotiationneeded to handle renegotiation safely
    pc.onnegotiationneeded = async () => {
      try {
        // Only create offer if signaling state is stable
        if (pc.signalingState !== 'stable') return;
        // If we have local tracks and we are the initiator (isOfferer true), create offer
        if (isOfferer) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketInstance.emit('webrtc-offer', { target: remoteSocketId, sdp: pc.localDescription });
        }
      } catch (err) {
        console.error('Negotiation error:', err);
      }
    };

    // If we are the offerer and have a local stream, add tracks now
    if (isOfferer && localStreamRef.current) {
      try {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      } catch (e) { console.error('Error adding tracks for offerer', e); }
    }

    return pc;
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      // By default, mute tracks
      s.getAudioTracks().forEach(t => t.enabled = !muted);
      localStreamRef.current = s;
      return s;
    } catch (e) {
      console.error('Microphone access denied or error:', e);
      return null;
    }
  };

  const toggleMute = async () => {
    const newMuted = !muted;
    setMuted(newMuted);
    // ensure local stream exists
    const s = await ensureLocalStream();
    if (s) {
      s.getAudioTracks().forEach(t => t.enabled = !newMuted);
    }
    // notify others
    if (socket) socket.emit('voice-toggle', { muted: newMuted });
    // add or remove tracks from existing peer connections
    for (const [remoteId, pc] of pcsRef.current.entries()) {
      try {
        // Replace existing audio sender track if possible
        const audioTrack = localStreamRef.current ? localStreamRef.current.getAudioTracks()[0] : null;
        let replaced = false;
        pc.getSenders().forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            try {
              if (audioTrack) {
                sender.replaceTrack(audioTrack);
              } else {
                // if no local audio track, disable by replacing with null
                sender.replaceTrack(null);
              }
              replaced = true;
            } catch (e) {
              console.warn('replaceTrack failed, will fallback to remove/add', e);
            }
          }
        });
        // If replaceTrack wasn't possible, fallback to remove/add and safe renegotiation
        if (!replaced) {
          pc.getSenders().forEach(sender => {
            if (sender.track && sender.track.kind === 'audio') {
              try { pc.removeTrack(sender); } catch(e){}
            }
          });
          if (!newMuted && localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
          }
        }
        // Trigger renegotiation when stable
        if (pc.signalingState === 'stable') {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (socket) socket.emit('webrtc-offer', { target: remoteId, sdp: pc.localDescription });
          } catch (e) {
            console.error('Reoffer error after mute toggle', e);
          }
        }
      } catch (e) {
        console.error('Error toggling mute on pc', e);
      }
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
  {/* hidden audio container for remote audio elements */}
  <div id="audio-container" className="hidden" />
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
              <button onClick={toggleMute} className="ml-4 px-3 py-1 rounded-md bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 transition">
                {muted ? <FaMicrophoneSlash className="inline-block mr-2" /> : <FaMicrophone className="inline-block mr-2" />} 
                <span className="text-sm">{muted ? 'Muted' : 'Unmuted'}</span>
              </button>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold mb-4">Participants ({users.length})</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (socket) socket.emit('leaveRoom'); navigate('/dashboard'); }} className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700">Leave</button>
                </div>
              </div>
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
            <div className="min-h-[60vh]">
                <CollaborativeEditor 
                  socket={socket} 
                  roomCode={roomCode} 
                  userRole={userRole}
                  initialSync={initialSync}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}