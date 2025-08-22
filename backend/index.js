const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
require('dotenv').config();

const protect = require('./middleware/auth.middleware.js');
const authRoutes = require('./routes/auth.routes.js');
const roomRoutes = require('./routes/room.routes.js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3000;
const prisma = require('./prisma.js');

// In-memory per-room state
const roomStates = new Map();
// Map of userId -> array of socketIds
const userSockets = new Map();

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true
  }
});

// Simple handshake rate limiting to protect against connection floods
const handshakeAttempts = new Map(); // ip -> { count, windowStart }
const HANDSHAKE_WINDOW_MS = 60 * 1000; // 1 minute
const HANDSHAKE_MAX = 40; // max connections per IP per window

// Per-socket event throttling (protect against spammy signaling/chat)
const socketEventCounters = new Map(); // socketId -> { count, windowStart }
const EVENT_WINDOW_MS = 1000; // 1 second
const EVENT_MAX = 20; // max events per socket per window

function allowSocketEvent(socketId) {
  const rec = socketEventCounters.get(socketId) || { count: 0, windowStart: Date.now() };
  if (Date.now() - rec.windowStart > EVENT_WINDOW_MS) {
    rec.count = 0; rec.windowStart = Date.now();
  }
  rec.count += 1;
  socketEventCounters.set(socketId, rec);
  return rec.count <= EVENT_MAX;
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // fine-tune CSP separately in production
}));
// Enable HSTS (strict transport security). In development this will be a no-op if not HTTPS.
if (helmet.hsts) app.use(helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: true }));
// Disable X-Powered-By header
app.disable('x-powered-by');

// Apply CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Basic rate limiting for all requests (protects against mass scans)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.use('/api/auth', authRoutes);
app.use('/api/room', protect, roomRoutes);

// Socket.IO middleware for authentication using JWT
io.use(async (socket, next) => {
  try {
    // basic handshake rate-limit
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (socket.handshake.address || socket.request?.connection?.remoteAddress || 'unknown');
    const rec = handshakeAttempts.get(ip) || { count: 0, windowStart: Date.now() };
    if (Date.now() - rec.windowStart > HANDSHAKE_WINDOW_MS) {
      rec.count = 0; rec.windowStart = Date.now();
    }
    rec.count += 1;
    handshakeAttempts.set(ip, rec);
    if (rec.count > HANDSHAKE_MAX) return next(new Error('Too many connection attempts'));
    // Accept token from auth, Authorization, or cookies (token or socketToken)
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      cookies.token ||                // httpOnly cookie used by REST
      cookies.socketToken;            // non-httpOnly cookie (if present)

    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return next(new Error('Invalid user'));

    socket.userId = user.id;
    socket.userName = user.name || user.email;
    next();
  } catch (err) {
    console.error('Socket.IO auth failed:', err.message);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User ${socket.userName} (${socket.userId}) connected`);

  // Track socket id for this user
  const existing = userSockets.get(socket.userId) || [];
  existing.push(socket.id);
  userSockets.set(socket.userId, existing);

  // Join room
  socket.on('joinRoom', async (roomCode) => {
    try {
      // Verify room exists and user is a participant
      const room = await prisma.room.findUnique({
        where: { code: roomCode.toUpperCase() },
        include: {
          participants: {
            where: { userId: socket.userId },
            include: { user: true }
          }
        }
      });

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.participants.length === 0) {
        socket.emit('error', { message: 'You are not a participant in this room' });
        return;
      }

      // Join the Socket.IO room
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.userRole = room.participants[0].role;

      // Get all participants in the room
      const allParticipants = await prisma.roomParticipant.findMany({
        where: { roomId: room.id },
        include: { user: true }
      });

      const participants = allParticipants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
  role: p.role,
  // include a currently-connected socket id if available (first one)
  socketId: (userSockets.get(p.user.id) || [null])[0]
      }));

      // Emit user joined event to all room members
      socket.to(roomCode).emit('userJoined', {
        user: {
          id: socket.userId,
          name: socket.userName,
          role: socket.userRole
        },
        participants
      });

      // Send current room state to the joining user
      socket.emit('roomJoined', {
        room: {
          code: room.code,
          organiserId: room.organiserId
        },
        participants,
        userRole: socket.userRole
      });

      // Send current editor state snapshot if available
      const existingState = roomStates.get(roomCode);
      if (existingState) {
        socket.emit('codeSync', {
          roomCode,
          code: existingState.code,
          language: existingState.language,
          theme: existingState.theme
        });
      }

      console.log(`User ${socket.userName} joined room ${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // WebRTC signaling helpers - forward to specific socket id targets
  socket.on('webrtc-offer', ({ target, sdp }) => {
  if (!target) return;
  if (!allowSocketEvent(socket.id)) return; // rate-limit per-socket
  io.to(target).emit('webrtc-offer', { from: socket.id, sdp, fromUserId: socket.userId });
  });

  socket.on('webrtc-answer', ({ target, sdp }) => {
  if (!target) return;
  if (!allowSocketEvent(socket.id)) return;
  io.to(target).emit('webrtc-answer', { from: socket.id, sdp });
  });

  socket.on('webrtc-ice', ({ target, candidate }) => {
  if (!target) return;
  if (!allowSocketEvent(socket.id)) return;
  io.to(target).emit('webrtc-ice', { from: socket.id, candidate });
  });

  // Voice mute/unmute broadcast
  socket.on('voice-toggle', ({ muted }) => {
    if (!allowSocketEvent(socket.id)) return;
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('voice-toggle', { socketId: socket.id, muted });
    }
  });

  // Explicit leave handler (client-requested)
  socket.on('leaveRoom', async () => {
    try {
  // mark socket as explicitly left to avoid duplicate userLeft on subsequent disconnect
  socket._explicitlyLeft = true;
      if (!socket.roomCode) return;
      const room = await prisma.room.findUnique({ where: { code: socket.roomCode.toUpperCase() } });
      if (!room) return;

      // Remove participant entry for this user in this room
      await prisma.roomParticipant.deleteMany({ where: { roomId: room.id, userId: socket.userId } });

      // Fetch updated participants
      const remaining = await prisma.roomParticipant.findMany({ where: { roomId: room.id }, include: { user: true } });

      // If no participants remain, delete the room
      if (remaining.length === 0) {
        await prisma.room.delete({ where: { id: room.id } });
      }

      // Emit userLeft to the room
      socket.to(socket.roomCode).emit('userLeft', {
        user: { id: socket.userId, name: socket.userName, role: socket.userRole },
        participants: remaining.map(p => ({ id: p.user.id, name: p.user.name, email: p.user.email, role: p.role }))
      });

      // Make socket leave the room
      socket.leave(socket.roomCode);
  delete socket.roomCode;
    } catch (err) {
      console.error('Error handling leaveRoom:', err);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    if (!allowSocketEvent(socket.id)) return;
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit('chatMessage', {
        user: {
          id: socket.userId,
          name: socket.userName,
          role: socket.userRole
        },
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle code changes
  socket.on('codeChange', (data) => {
    if (socket.roomCode && data.roomCode === socket.roomCode) {
      // Persist last known code state for this room
      const currentState = roomStates.get(socket.roomCode) || { code: '', language: 'javascript', theme: 'vs-dark' };
      roomStates.set(socket.roomCode, { ...currentState, code: data.code });
      socket.to(socket.roomCode).emit('codeChange', {
        userId: socket.userId,
        userName: socket.userName,
        roomCode: data.roomCode,
        code: data.code,
        timestamp: data.timestamp
      });
    }
  });

  // Handle language changes
  socket.on('languageChange', (data) => {
    if (socket.roomCode && data.roomCode === socket.roomCode) {
      // Persist language in room state
      const currentState = roomStates.get(socket.roomCode) || { code: '', language: 'javascript', theme: 'vs-dark' };
      roomStates.set(socket.roomCode, { ...currentState, language: data.language });
      socket.to(socket.roomCode).emit('languageChange', {
        userId: socket.userId,
        userName: socket.userName,
        roomCode: data.roomCode,
        language: data.language
      });
    }
  });

  // Handle theme changes
  socket.on('themeChange', (data) => {
    if (socket.roomCode && data.roomCode === socket.roomCode) {
      // Persist theme in room state
      const currentState = roomStates.get(socket.roomCode) || { code: '', language: 'javascript', theme: 'vs-dark' };
      roomStates.set(socket.roomCode, { ...currentState, theme: data.theme });
      socket.to(socket.roomCode).emit('themeChange', {
        userId: socket.userId,
        userName: socket.userName,
        roomCode: data.roomCode,
        theme: data.theme
      });
    }
  });

  // Handle cursor position changes (for future cursor tracking)
  socket.on('cursorChange', (data) => {
    if (socket.roomCode && data.roomCode === socket.roomCode) {
      socket.to(socket.roomCode).emit('cursorChange', {
        userId: socket.userId,
        userName: socket.userName,
        roomCode: data.roomCode,
        position: data.position
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    // remove socket id from userSockets map
    try {
      const arr = userSockets.get(socket.userId) || [];
      const filtered = arr.filter(sid => sid !== socket.id);
      if (filtered.length > 0) userSockets.set(socket.userId, filtered);
      else userSockets.delete(socket.userId);
    } catch (e) {
      console.error('Error cleaning userSockets map:', e);
    }
    // If already explicitly left via leaveRoom, skip room cleanup to avoid duplicate userLeft
    if (socket._explicitlyLeft) {
      console.log(`Socket ${socket.id} explicitly left earlier; skipping disconnect cleanup.`);
    }

    if (socket.roomCode) {
      try {
        // If user has other active sockets, don't remove their participant entry
        const remainingSockets = userSockets.get(socket.userId) || [];
  if (remainingSockets.length === 0) {
          // Find the room by code
          const room = await prisma.room.findUnique({ where: { code: socket.roomCode.toUpperCase() } });
          if (room) {
            // Remove participant record for this user
            await prisma.roomParticipant.deleteMany({ where: { roomId: room.id, userId: socket.userId } });

            // Fetch updated participants
            const remaining = await prisma.roomParticipant.findMany({ where: { roomId: room.id }, include: { user: true } });

            // If no participants remain, delete the room
            if (remaining.length === 0) {
              await prisma.room.delete({ where: { id: room.id } });
            }

            // Emit user left event
            socket.to(socket.roomCode).emit('userLeft', {
              user: { id: socket.userId, name: socket.userName, role: socket.userRole },
              participants: remaining.map(p => ({ id: p.user.id, name: p.user.name, email: p.user.email, role: p.role }))
            });
          }
        }

        console.log(`User ${socket.userName} left room ${socket.roomCode}`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
    console.log(`User ${socket.userName} (${socket.userId}) disconnected`);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket ready (CORS → ${FRONTEND_URL})`);
});