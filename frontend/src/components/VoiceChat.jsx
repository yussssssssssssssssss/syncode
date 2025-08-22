import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function VoiceChat({ socket }) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState({}); // socketId -> { peer, stream, muted }
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const localAudioRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> Peer instance

  // Helpers
  const addRemoteAudio = (socketId, remoteStream) => {
    let audio = document.getElementById(`audio-${socketId}`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `audio-${socketId}`;
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = remoteStream;
  };

  const removeRemoteAudio = (socketId) => {
    const audio = document.getElementById(`audio-${socketId}`);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
    }
  };

  const cleanupPeers = () => {
    peersRef.current.forEach((p, id) => {
      try { p.destroy(); } catch {}
      removeRemoteAudio(id);
    });
    peersRef.current.clear();
    setPeers({});
  };

  // Join voice: get mic + announce to room
  const joinVoice = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Play your own audio locally (muted to avoid echo)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      socket.emit("voice:join");
      setJoined(true);
      setMuted(false);
      // ensure track enabled
      stream.getAudioTracks().forEach(t => (t.enabled = true));
    } catch (e) {
      setError(e.message || "Microphone permission denied");
    }
  };

  // Leave voice: stop tracks and tell others
  const leaveVoice = () => {
    socket.emit("voice:leave");
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localAudioRef.current) localAudioRef.current.srcObject = null;
    cleanupPeers();
    setJoined(false);
  };

  // Toggle mute (local only) + notify others for UI
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach(t => (t.enabled = !next)); // disabled when muted
    setMuted(next);
    socket.emit("voice:mute", { muted: next });
  };

  // Create a Peer to a specific target
  const createPeer = (targetId, initiator) => {
    const stream = localStreamRef.current;
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
    });

    peer.on("signal", (signal) => {
      socket.emit("voice:signal", { targetId, signal });
    });

    peer.on("stream", (remoteStream) => {
      addRemoteAudio(targetId, remoteStream);
      setPeers(prev => ({
        ...prev,
        [targetId]: { ...(prev[targetId] || {}), muted: false }
      }));
    });

    peer.on("error", () => {});
    peer.on("close", () => {
      removeRemoteAudio(targetId);
      peersRef.current.delete(targetId);
      setPeers(prev => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });
    });

    peersRef.current.set(targetId, peer);
    return peer;
  };

  useEffect(() => {
    if (!socket) return;

    // Existing peers when you join
    const onPeers = ({ peers: existing, you }) => {
      // Create initiator peers to everyone already in the voice room
      existing.forEach((pid) => createPeer(pid, true));
    };

    // A new user joined voice later; you create a non-initiator peer for them
    const onUserJoined = ({ socketId }) => {
      createPeer(socketId, false);
    };

    // Incoming WebRTC signal
    const onSignal = ({ fromId, signal }) => {
      let peer = peersRef.current.get(fromId);
      if (!peer) {
        // Create a receiver peer if it doesn't exist yet
        peer = createPeer(fromId, false);
      }
      peer.signal(signal);
    };

    // A user left voice
    const onUserLeft = ({ socketId }) => {
      const peer = peersRef.current.get(socketId);
      if (peer) peer.destroy();
    };

    // Someone toggled mute (purely for UI)
    const onMute = ({ socketId, muted }) => {
      setPeers(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), muted: !!muted }
      }));
    };

    socket.on("voice:peers", onPeers);
    socket.on("voice:user-joined", onUserJoined);
    socket.on("voice:signal", onSignal);
    socket.on("voice:user-left", onUserLeft);
    socket.on("voice:mute", onMute);

    return () => {
      socket.off("voice:peers", onPeers);
      socket.off("voice:user-joined", onUserJoined);
      socket.off("voice:signal", onSignal);
      socket.off("voice:user-left", onUserLeft);
      socket.off("voice:mute", onMute);
    };
  }, [socket]);

  return (
    <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
      <h2 className="text-lg font-semibold mb-3">Voice</h2>

      {error && <div className="mb-3 p-2 text-sm rounded bg-red-100 text-red-700">{error}</div>}

      <div className="flex items-center gap-2 mb-4">
        {!joined ? (
          <button
            onClick={joinVoice}
            className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Join Voice
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`px-3 py-2 rounded text-white ${muted ? "bg-gray-500 hover:bg-gray-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={leaveVoice}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Leave Voice
            </button>
          </>
        )}
      </div>

      <audio ref={localAudioRef} autoPlay playsInline muted />

      <div className="text-sm">
        <div className="font-medium mb-2">Participants in voice:</div>
        {Object.keys(peers).length === 0 ? (
          <div className="text-gray-500 dark:text-slate-400">No one else is in voice yet.</div>
        ) : (
          <ul className="space-y-1">
            {Object.entries(peers).map(([sid, info]) => (
              <li key={sid} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-slate-900/40">
                <span className="font-mono text-xs">{sid.slice(0,8)}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${info.muted ? "bg-gray-200 dark:bg-slate-700" : "bg-green-100 text-green-800"}`}>
                  {info.muted ? "Muted" : "Speaking"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}