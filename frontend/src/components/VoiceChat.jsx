import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

/**
 * VoiceChat
 * - Mesh P2P audio using simple-peer + your existing Socket.IO connection
 * - Anyone can mute/unmute themselves
 * - No roles/permissions involved
 */
export default function VoiceChat({ socket, roomCode }) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(true); // start muted
  const [connecting, setConnecting] = useState(false);
  const [peers, setPeers] = useState({}); // socketId -> { peer, stream }
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const localAudioRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> Peer

  // --- ICE servers: works for most dev cases. For prod/NAT edge cases, add a TURN (see notes).
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  ];

  useEffect(() => {
    if (!socket || !roomCode) return;

    // Incoming WebRTC signaling
    socket.on("voice:signal", handleSignal);
    socket.on("voice:peer-left", handlePeerLeft);
    socket.on("voice:participants", handleParticipants);
    socket.on("voice:error", (e) => setError(e?.message || "Voice error"));

    return () => {
      socket.off("voice:signal", handleSignal);
      socket.off("voice:peer-left", handlePeerLeft);
      socket.off("voice:participants", handleParticipants);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomCode]);

  const handleParticipants = ({ participants }) => {
    // UI-only: show who is in voice channel if you like.
    // We don't need to do anything special here for the mesh itself.
  };

  const handlePeerLeft = ({ socketId }) => {
    const entry = peersRef.current.get(socketId);
    if (entry) {
      try { entry.destroy(); } catch {}
      peersRef.current.delete(socketId);
      setPeers((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      // Remove remote audio element
      const audio = document.getElementById(`voice-audio-${socketId}`);
      if (audio) {
        audio.srcObject = null;
        audio.remove();
      }
    }
  };

  const handleSignal = async ({ from, signal }) => {
    let p = peersRef.current.get(from);
    if (!p) {
      // Create non-initiator peer on receiving a signal from a new remote
      p = await createPeer(false, from);
      peersRef.current.set(from, p);
    }
    try {
      p.signal(signal);
    } catch (e) {
      console.error("signal error:", e);
    }
  };

  const createPeer = async (initiator, remoteSocketId) => {
    // Ensure we have local stream
    if (!localStreamRef.current) {
      // mic permission only once
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // attach to local audio element (muted so no echo)
      if (!localAudioRef.current) {
        localAudioRef.current = document.createElement("audio");
        localAudioRef.current.autoplay = true;
        localAudioRef.current.muted = true;
        localAudioRef.current.playsInline = true;
        localAudioRef.current.id = "voice-audio-local";
        document.body.appendChild(localAudioRef.current);
      }
      localAudioRef.current.srcObject = stream;

      // apply current mute state to track
      stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    }

    const peer = new Peer({
      initiator,
      trickle: true,
      stream: localStreamRef.current,
      config: { iceServers },
    });

    peer.on("signal", (signal) => {
      socket.emit("voice:signal", {
        roomCode,
        to: remoteSocketId,
        signal,
      });
    });

    peer.on("stream", (remoteStream) => {
      // Add/replace a remote <audio> tag
      let audio = document.getElementById(`voice-audio-${remoteSocketId}`);
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `voice-audio-${remoteSocketId}`;
        audio.autoplay = true;
        audio.playsInline = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;

      // Track in React state (for UI badges, etc.)
      setPeers((prev) => ({
        ...prev,
        [remoteSocketId]: { peer, stream: remoteStream },
      }));
    });

    peer.on("close", () => handlePeerLeft({ socketId: remoteSocketId }));
    peer.on("error", (e) => {
      console.error("peer error:", e);
      setError(e.message || "Peer error");
    });

    return peer;
  };

  const joinVoice = async () => {
    try {
      setConnecting(true);
      setError(null);
      // Get mic immediately so we can send to peers
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
      }
      socket.emit("voice:join", { roomCode });
      setJoined(true);
    } catch (e) {
      setError(e.message || "Failed to join voice");
    } finally {
      setConnecting(false);
    }
  };

  // When server tells us current voice members, proactively connect
  useEffect(() => {
    if (!joined || !socket) return;

    const handleRosterAndOffer = async ({ members }) => {
      // Create initiator peers to everyone already in the voice room
      for (const socketId of members) {
        if (socketId === socket.id) continue;
        if (!peersRef.current.get(socketId)) {
          const p = await createPeer(true, socketId);
          peersRef.current.set(socketId, p);
        }
      }
    };

    socket.on("voice:roster", handleRosterAndOffer);
    return () => socket.off("voice:roster", handleRosterAndOffer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, socket]);

  const leaveVoice = () => {
    socket.emit("voice:leave", { roomCode });
    setJoined(false);
    // destroy peers and streams
    peersRef.current.forEach((p) => {
      try { p.destroy(); } catch {}
    });
    peersRef.current.clear();
    setPeers({});
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    const localEl = document.getElementById("voice-audio-local");
    if (localEl) { localEl.srcObject = null; localEl.remove(); }
    // remove remote elements
    Object.keys(peers).forEach((sid) => {
      const el = document.getElementById(`voice-audio-${sid}`);
      if (el) { el.srcObject = null; el.remove(); }
    });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    socket.emit("voice:mute", { roomCode, muted: next });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Voice</h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {Object.keys(peers).length + (joined ? 1 : 0)} in call
        </div>
      </div>

      {error && <div className="mb-3 text-red-600 text-sm">Audio error: {error}</div>}

      {!joined ? (
        <button
          onClick={joinVoice}
          disabled={connecting}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {connecting ? "Joining…" : "Join voice"}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className={`px-4 py-2 rounded ${muted ? "bg-slate-600" : "bg-emerald-600"} text-white hover:opacity-90`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={leaveVoice}
            className="px-4 py-2 rounded bg-rose-600 text-white hover:bg-rose-700"
          >
            Leave
          </button>
        </div>
      )}

      {/* Tiny legend */}
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Tip: everyone can mute/unmute themselves. No organiser privileges needed.
      </div>
    </div>
  );
}