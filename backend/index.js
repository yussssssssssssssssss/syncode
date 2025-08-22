const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./generated/prisma');
require('dotenv').config();

const protect = require('./middleware/auth.middleware.js');
const authRoutes = require('./routes/auth.routes.js');
const roomRoutes = require('./routes/room.routes.js');

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient();

// In-memory per-room state
const roomStates = new Map();

// CORS configuration - MUST be before other middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Cookie parser MUST be before other middleware that uses cookies
app.use(cookieParser());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (after cookie parser)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Always true for Vercel + Render (both use HTTPS)
    httpOnly: true,
    sameSite: "none", // Required for cross-origin cookies
    maxAge: 24 * 60 * 60 * 1000,
    domain: undefined // Don't set domain for cross-origin cookies
  }
}));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Cookies:', req.cookies);
  console.log('Authorization header:', req.headers.authorization);
  next();
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true
  }
});

// Routes
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.use('/api/auth', authRoutes);
app.use('/api/room', protect, roomRoutes);

// Socket.IO middleware for authentication using JWT
io.use(async (socket, next) => {
  try {
    let token;

    // Try multiple ways to get the token for cross-origin setup
    // 1. From auth object (when explicitly passed)
    if (socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    // 2. From Authorization header
    else if (socket.handshake.headers.authorization?.startsWith('Bearer ')) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }
    // 3. From cookies (parse manually for cross-origin)
    else if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'socketToken' || name === 'token') {
          token = value;
          break;
        }
      }
    }
    
    if (!token) {
      console.log('Socket.IO: No token provided');
      console.log('Available cookies:', socket.handshake.headers.cookie);
      console.log('Auth object:', socket.handshake.auth);
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) {
      console.log('Socket.IO: User not found for token');
      return next(new Error('Invalid user'));
    }

    socket.userId = user.id;
    socket.userName = user.name || user.email;
    console.log(`Socket.IO authenticated: ${socket.userName}`);
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
      const currentState = roomStates.get(socket.roomCode) || {
        code: '',
        language: 'javascript',
        theme: 'vs-dark'
      };
      roomStates.set(socket.roomCode, {
        ...currentState,
        code: data.code
      });

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
      const currentState = roomStates.get(socket.roomCode) || {
        code: '',
        language: 'javascript',
        theme: 'vs-dark'
      };
      roomStates.set(socket.roomCode, {
        ...currentState,
        language: data.language
      });

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
      const currentState = roomStates.get(socket.roomCode) || {
        code: '',
        language: 'javascript',
        theme: 'vs-dark'
      };
      roomStates.set(socket.roomCode, {
        ...currentState,
        theme: data.theme
      });

      socket.to(socket.roomCode).emit('themeChange', {
        userId: socket.userId,
        userName: socket.userName,
        roomCode: data.roomCode,
        theme: data.theme
      });
    }
  });

  // Handle cursor position changes
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