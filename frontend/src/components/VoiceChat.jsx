import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

export default function VoiceChat({ socket, roomCode }) {
    const [joined, setJoined] = useState(false);
    const [muted, setMuted] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [peers, setPeers] = useState({});
    const [error, setError] = useState(null);

    const localStreamRef = useRef(null);
    const localAudioRef = useRef(null);
    const peersRef = useRef(new Map()); // socketId -> Peer
    const creatingRef = useRef(new Set()); // socketIds currently being created
    const pendingSignalsRef = useRef(new Map()); // socketId -> Signal[]

    const iceServers = [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "5de920dfe821f5bc7448b091",
            credential: "IjNHz31w8QBo1vZq",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "5de920dfe821f5bc7448b091",
            credential: "IjNHz31w8QBo1vZq",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "5de920dfe821f5bc7448b091",
            credential: "IjNHz31w8QBo1vZq",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "5de920dfe821f5bc7448b091",
            credential: "IjNHz31w8QBo1vZq",
        },
    ];

    // Util: create or get array for queued signals
    const queueSignal = (from, signal) => {
        let arr = pendingSignalsRef.current.get(from);
        if (!arr) {
            arr = [];
            pendingSignalsRef.current.set(from, arr);
        }
        arr.push(signal);
    };

    // If we create a peer after signals arrived, flush them
    const flushQueuedSignals = (from, peer) => {
        const arr = pendingSignalsRef.current.get(from);
        if (arr && arr.length) {
            arr.forEach((sig) => {
                try { peer.signal(sig); } catch { }
            });
            pendingSignalsRef.current.delete(from);
        }
    };

    useEffect(() => {
        if (!socket || !roomCode) return;

        const onSignal = async ({ from, signal }) => {
            if (from === socket.id) return; // ignore our own
            let p = peersRef.current.get(from);

            // If peer doesn’t exist yet and another signal arrives first, queue it
            if (!p && creatingRef.current.has(from)) {
                queueSignal(from, signal);
                return;
            }

            if (!p) {
                // Create a non-initiator
                try {
                    creatingRef.current.add(from);
                    p = await createPeer(false, from);
                    peersRef.current.set(from, p);
                    creatingRef.current.delete(from);
                    flushQueuedSignals(from, p);
                } catch (e) {
                    creatingRef.current.delete(from);
                    console.error("createPeer(non-initiator) failed:", e);
                    setError(e.message || "Voice error");
                    return;
                }
            }

            try {
                p.signal(signal);
            } catch (e) {
                console.error("peer.signal failed:", e);
            }
        };

        const onPeerLeft = ({ socketId }) => {
            const entry = peersRef.current.get(socketId);
            if (entry) {
                try { entry.destroy(); } catch { }
                peersRef.current.delete(socketId);
                setPeers((prev) => {
                    const copy = { ...prev };
                    delete copy[socketId];
                    return copy;
                });
            }
            const el = document.getElementById(`voice-audio-${socketId}`);
            if (el) { el.srcObject = null; el.remove(); }
            pendingSignalsRef.current.delete(socketId);
            creatingRef.current.delete(socketId);
        };

        const onParticipants = () => { /* optional UI hook */ };

        socket.on("voice:signal", onSignal);
        socket.on("voice:peer-left", onPeerLeft);
        socket.on("voice:participants", onParticipants);
        socket.on("voice:error", (e) => setError(e?.message || "Voice error"));

        return () => {
            socket.off("voice:signal", onSignal);
            socket.off("voice:peer-left", onPeerLeft);
            socket.off("voice:participants", onParticipants);
            socket.off("voice:error");
        };
    }, [socket, roomCode]);

    const ensureLocalStream = async () => {
        if (localStreamRef.current) return localStreamRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // obey current mute state
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
        localStreamRef.current = stream;

        // local monitor (muted to avoid echo)
        if (!localAudioRef.current) {
            localAudioRef.current = document.createElement("audio");
            localAudioRef.current.id = "voice-audio-local";
            localAudioRef.current.autoplay = true;
            localAudioRef.current.muted = true;
            localAudioRef.current.playsInline = true;
            document.body.appendChild(localAudioRef.current);
        }
        localAudioRef.current.srcObject = stream;
        try { await localAudioRef.current.play(); } catch { }
        return stream;
    };

    const createPeer = async (initiator, remoteSocketId) => {
        const stream = await ensureLocalStream();

        const peer = new Peer({
            initiator,
            trickle: true,
            stream,
            config: { iceServers },
        });

        peer.on("signal", (signal) => {
            // relay via socket
            if (!socket || !roomCode) return;
            socket.emit("voice:signal", { roomCode, to: remoteSocketId, signal });
        });

        peer.on("stream", async (remoteStream) => {
            let audio = document.getElementById(`voice-audio-${remoteSocketId}`);
            if (!audio) {
                audio = document.createElement("audio");
                audio.id = `voice-audio-${remoteSocketId}`;
                audio.autoplay = true;
                audio.playsInline = true;
                document.body.appendChild(audio);
            }
            audio.srcObject = remoteStream;
            try { await audio.play(); } catch { }

            setPeers((prev) => ({ ...prev, [remoteSocketId]: { peer, stream: remoteStream } }));
        });

        // Helpful ICE logging
        peer._pc?.addEventListener("iceconnectionstatechange", () => {
            // eslint-disable-next-line no-console
            console.log(`[ICE ${remoteSocketId}]`, peer._pc.iceConnectionState);
        });

        peer.on("close", () => removePeer(remoteSocketId));
        peer.on("error", (e) => {
            console.error("peer error:", e);
            setError(e.message || "Peer error");
        });

        return peer;
    };

    const removePeer = (socketId) => {
        const p = peersRef.current.get(socketId);
        if (p) {
            try { p.destroy(); } catch { }
            peersRef.current.delete(socketId);
            setPeers((prev) => {
                const copy = { ...prev };
                delete copy[socketId];
                return copy;
            });
        }
        const el = document.getElementById(`voice-audio-${socketId}`);
        if (el) { el.srcObject = null; el.remove(); }
        pendingSignalsRef.current.delete(socketId);
        creatingRef.current.delete(socketId);
    };

    const joinVoice = async () => {
        if (!socket) return;
        try {
            setConnecting(true);
            setError(null);
            await ensureLocalStream(); // user gesture here unlocks autoplay
            socket.emit("voice:join", { roomCode });
            setJoined(true);
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to join voice");
        } finally {
            setConnecting(false);
        }
    };

    useEffect(() => {
        if (!joined || !socket) return;
        const handler = async ({ members }) => {
            // We initiate connections to everyone already in the room
            for (const sid of members) {
                if (sid === socket.id) continue;
                if (peersRef.current.has(sid) || creatingRef.current.has(sid)) continue;
                try {
                    creatingRef.current.add(sid);
                    const p = await createPeer(true, sid);
                    peersRef.current.set(sid, p);
                    creatingRef.current.delete(sid);
                    flushQueuedSignals(sid, p);
                } catch (e) {
                    creatingRef.current.delete(sid);
                    console.error("createPeer(initiator) failed:", e);
                }
            }
        };
        socket.on("voice:roster", handler);
        return () => socket.off("voice:roster", handler);
    }, [joined, socket]);

    const leaveVoice = () => {
        if (socket) socket.emit("voice:leave", { roomCode });
        setJoined(false);
        peersRef.current.forEach((p, sid) => removePeer(sid));
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        const localEl = document.getElementById("voice-audio-local");
        if (localEl) { localEl.srcObject = null; localEl.remove(); }
    };

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
        }
        if (socket) socket.emit("voice:mute", { roomCode, muted: next });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700 transition-colors">
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

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Tip: you may see ICE logs in the console; if it gets stuck at “checking” → add TURN.
            </div>
        </div>
    );
}
