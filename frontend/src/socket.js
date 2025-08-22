// src/socket.js
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// If you store JWT in localStorage after login:
const token = localStorage.getItem("token");

export const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,          // include cookies if backend sets httpOnly cookie
  auth: token ? { token } : {},   // ALSO pass token in handshake
});

// Debug (helpful)
socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
socket.on("connect_error", (err) => console.error("❌ Socket connect error:", err.message));
