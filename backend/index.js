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

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3000;
const prisma = require('./prisma.js');

// In-memory per-room state
const roomStates = new Map();
const voiceRooms = new Map();

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true
  }
});

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

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

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
        role: p.role
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

  // Handle chat messages
  socket.on('chatMessage', (message) => {
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

  // ---------- Voice chat signaling ----------
  //
  function getVoiceSet(roomCode) {
    if (!voiceRooms.has(roomCode)) voiceRooms.set(roomCode, new Set());
    return voiceRooms.get(roomCode);
  }

  // User opts in to voice for the current room
  socket.on('voice:join', () => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;

    const set = getVoiceSet(roomCode);
    // Send the current peer socket IDs (others already in voice) to the joiner
    socket.emit('voice:peers', {
      peers: [...set],
      you: socket.id,
      user: { id: socket.userId, name: socket.userName }
    });

    // Add self and notify others
    set.add(socket.id);
    socket.to(roomCode).emit('voice:user-joined', {
      socketId: socket.id,
      user: { id: socket.userId, name: socket.userName }
    });
  });

  // WebRTC signaling payload relay
  socket.on('voice:signal', ({ targetId, signal }) => {
    if (!targetId || !signal) return;
    io.to(targetId).emit('voice:signal', {
      fromId: socket.id,
      user: { id: socket.userId, name: socket.userName },
      signal
    });
  });

  // Broadcast mute state so UIs can reflect it
  socket.on('voice:mute', ({ muted }) => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;
    socket.to(roomCode).emit('voice:mute', {
      socketId: socket.id,
      user: { id: socket.userId, name: socket.userName },
      muted: !!muted
    });
  });

  // User leaves the voice channel explicitly
  socket.on('voice:leave', () => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;
    const set = voiceRooms.get(roomCode);
    if (set) set.delete(socket.id);
    socket.to(roomCode).emit('voice:user-left', { socketId: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const roomCode = socket.roomCode;
    if (roomCode && voiceRooms.has(roomCode)) {
      const set = voiceRooms.get(roomCode);
      set.delete(socket.id);
      socket.to(roomCode).emit('voice:user-left', { socketId: socket.id });
    }
    if (socket.roomCode) {
      try {
        // Get updated participants list
        const room = await prisma.room.findUnique({
          where: { code: socket.roomCode },
          include: {
            participants: {
              include: { user: true }
            }
          }
        });

        if (room) {
          const participants = room.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            role: p.role
          }));

          // Emit user left event
          socket.to(socket.roomCode).emit('userLeft', {
            user: {
              id: socket.userId,
              name: socket.userName,
              role: socket.userRole
            },
            participants
          });
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