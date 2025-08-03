const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./generated/prisma');
require('dotenv').config();

const protect = require('./middleware/auth.middleware.js')
const authRoutes = require('./routes/auth.routes.js');
const roomRoutes = require('./routes/room.routes.js');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

const PORT = 3000;
const prisma = new PrismaClient();

// Session middleware for HTTP requests
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: false, // Allow JavaScript access for Socket.IO
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use('/api/auth', authRoutes);
app.use('/api/room', protect, roomRoutes);

// Socket.IO middleware for authentication using JWT
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Socket.IO authentication failed - no token provided');
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      console.log('Socket.IO authentication failed - invalid user');
      return next(new Error('Invalid user'));
    }

    socket.userId = user.id;
    socket.userName = user.name || user.email;
    console.log(`Socket.IO authentication successful for user: ${socket.userName}`);
    next();
  } catch (error) {
    console.log('Socket.IO authentication failed:', error.message);
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

server.listen(PORT, ()=> {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready`);
})