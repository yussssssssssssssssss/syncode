# Syncode - Real-time Collaborative Coding Platform

A real-time collaborative coding platform built with React, Node.js, Express, PostgreSQL, and Socket.IO.

## Features

### Real-time WebSocket Functionality
- **Room Management**: Create and join rooms with unique 6-digit alphanumeric codes
- **Live User Updates**: Real-time participant join/leave notifications
- **Chat System**: Bi-directional messaging between room participants
- **Role-based Access**: Organiser and participant roles with different permissions
- **Connection Status**: Visual indicators for WebSocket connection status

### Authentication
- Email/Password authentication with bcrypt hashing
- JWT token-based authentication
- Session management for WebSocket connections
- Secure cookie handling

### Database Schema
- **Users**: User accounts with email, password, and profile information
- **Rooms**: Room entities with unique codes and organiser references
- **RoomParticipants**: Junction table for user-room relationships with roles

## Tech Stack

### Frontend
- React 19 with Vite
- Tailwind CSS for styling
- Socket.IO Client for real-time communication
- React Router for navigation

### Backend
- Node.js with Express
- Socket.IO for WebSocket functionality
- Prisma ORM with PostgreSQL
- JWT for authentication
- Express-session for session management

### Database
- PostgreSQL with Prisma migrations

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

### Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/syncode"
JWT_SECRET="your-jwt-secret-key"
SESSION_SECRET="your-session-secret-key"
```

Set up the database:
```bash
npx prisma generate
npx prisma db push
```

Start the backend server:
```bash
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
```

Start the development server:
```bash
npm run dev
```

## WebSocket Events

### Client to Server
- `joinRoom(roomCode)`: Join a specific room
- `chatMessage(message)`: Send a chat message to room participants

### Server to Client
- `roomJoined(data)`: Confirmation of successful room join with room data
- `userJoined(data)`: Notification when a new user joins the room
- `userLeft(data)`: Notification when a user leaves the room
- `chatMessage(data)`: Receive chat messages from other participants
- `error(data)`: Error notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user (protected)

### Rooms
- `POST /api/room/create` - Create a new room (protected)
- `POST /api/room/join` - Join an existing room (protected)
- `GET /api/room/:roomId/users` - Get room participants (protected)
- `GET /api/room/:code` - Get room by code (protected)

## Usage

### Creating a Room
1. Log in to your account
2. Click "Create Room" on the dashboard
3. You'll be automatically redirected to the room with a unique code
4. Share the room code with others to invite them

### Joining a Room
1. Log in to your account
2. Click "Join Room" on the dashboard
3. Enter the 6-digit room code
4. You'll be redirected to the room if the code is valid

### Real-time Features
- **Live Participants**: See all connected users in real-time
- **Chat**: Send and receive messages with all room participants
- **Connection Status**: Monitor your WebSocket connection status
- **User Notifications**: Get notified when users join or leave

## Security Features

- **Authentication Required**: All WebSocket connections require valid session
- **Room Access Control**: Users can only join rooms they're participants in
- **JWT Token Validation**: Secure token-based authentication
- **Session Management**: Proper session handling for WebSocket connections
- **CORS Configuration**: Secure cross-origin resource sharing

## Development

### Project Structure
```
syncode/
├── backend/
│   ├── controllers/     # API route handlers
│   ├── middleware/      # Authentication middleware
│   ├── routes/          # API routes
│   ├── prisma/          # Database schema and migrations
│   └── index.js         # Main server file with Socket.IO
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── config.js    # Configuration
│   └── package.json
└── README.md
```

### Key Implementation Details

#### WebSocket Authentication
The application uses express-session middleware to authenticate WebSocket connections. When users log in, session data is set and validated for each Socket.IO connection.

#### Room Management
- Unique 6-digit alphanumeric room codes are generated
- Users are automatically added as participants when creating/joining rooms
- Role-based access (organiser vs participant)

#### Real-time Updates
- User join/leave events are broadcast to all room participants
- Chat messages are sent to all users in the room
- Connection status is displayed to users

## Future Enhancements

- Collaborative code editor with real-time synchronization
- Screen sharing capabilities
- Voice/video chat integration
- File sharing within rooms
- Room persistence and history
- User presence indicators
- Typing indicators for chat

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure backend server is running on port 3000
   - Check CORS configuration
   - Verify session is properly set after login

2. **Room Join Fails**
   - Verify room code is correct
   - Ensure user is authenticated
   - Check database connection

3. **Chat Messages Not Sending**
   - Verify WebSocket connection status
   - Check if user is in the correct room
   - Ensure message is not empty

### Debug Mode
Enable debug logging by setting environment variables:
```env
DEBUG=socket.io:*
NODE_ENV=development
```

## License

This project is licensed under the MIT License. 