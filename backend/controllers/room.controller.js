const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Helper: Generate a unique 6-character room code
const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// POST /api/room/create
exports.create = async (req, res) => {
  try {
    const code = generateRoomCode();

    // Ensure uniqueness
    const existing = await prisma.room.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ message: 'Room code already exists, retry' });

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
    const room = await prisma.room.findUnique({ where: { code } });
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
exports.users =  async (req, res) => {
  const roomId = parseInt(req.params.roomId);

  if (isNaN(roomId)) return res.status(400).json({ message: 'Invalid room ID' });

  try {
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
