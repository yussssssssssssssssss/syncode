const prisma = require('../prisma');

// Helper: Generate a unique 6-character room code
const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// POST /api/room/create
exports.create = async (req, res) => {
  try {
    let code = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure uniqueness with retry logic
    while (attempts < maxAttempts) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return res.status(500).json({ message: 'Failed to generate unique room code' });
    }

    const room = await prisma.room.create({
      data: {
        code,
        organiserId: req.user.id,
        participants: {
          create: {
            userId: req.user.id,
            role: 'organiser'
          }
        }
      }
    });

    res.status(201).json({
      message: 'Room created',
      roomId: room.code, // Return code as roomId for frontend compatibility
      room: {
        id: room.id,
        code: room.code,
        organiserId: room.organiserId
      }
    });
  } catch (err) {
    console.error('Room creation failed:', err);
    res.status(500).json({ message: 'Room creation error', error: err.message });
  }
};

// POST /api/room/join
exports.join = async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ message: 'Room code is required' });

  try {
    const room = await prisma.room.findUnique({ 
      where: { code: code.toUpperCase() } // Ensure case-insensitive matching
    });
    
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Check if user already in room
    const alreadyInRoom = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: req.user.id
      }
    });

    if (alreadyInRoom) {
      return res.status(200).json({
        message: 'Already joined',
        room: {
          id: room.id,
          code: room.code,
          organiserId: room.organiserId
        }
      });
    }

    // Add participant
    await prisma.roomParticipant.create({
      data: {
        userId: req.user.id,
        roomId: room.id,
        role: 'participant'
      }
    });

    res.status(200).json({
      message: 'Joined room',
      room: {
        id: room.id,
        code: room.code,
        organiserId: room.organiserId
      }
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ message: 'Failed to join room', error: err.message });
  }
};

// GET /api/room/:roomId/users
exports.users = async (req, res) => {
  const roomId = parseInt(req.params.roomId);

  if (isNaN(roomId)) return res.status(400).json({ message: 'Invalid room ID' });

  try {
    // Check if user is a participant in this room
    const userInRoom = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: req.user.id
      }
    });

    if (!userInRoom) {
      return res.status(403).json({ message: 'You are not a participant in this room' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const users = room.participants.map(p => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.role
    }));

    res.json({ users });
  } catch (err) {
    console.error('Fetch room users error:', err);
    res.status(500).json({ message: 'Failed to get room users', error: err.message });
  }
};

// GET /api/room/:code - Get room by code (alternative endpoint)
exports.getByCode = async (req, res) => {
  const { code } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Check if user is a participant
    const userInRoom = room.participants.find(p => p.userId === req.user.id);
    if (!userInRoom) {
      return res.status(403).json({ message: 'You are not a participant in this room' });
    }

    const users = room.participants.map(p => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.role
    }));

    res.json({
      room: {
        id: room.id,
        code: room.code,
        organiserId: room.organiserId
      },
      users
    });
  } catch (err) {
    console.error('Get room by code error:', err);
    res.status(500).json({ message: 'Failed to get room', error: err.message });
  }
};