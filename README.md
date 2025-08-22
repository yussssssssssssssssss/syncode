# Syncode - Real-time Collaborative Coding Platform

A real-time collaborative coding platform built with React, Node.js, Express, PostgreSQL, and Socket.IO.

## Features

### Real-time WebSocket Functionality
- **Room Management**: Create and join rooms with unique 6-digit alphanumeric codes
- **Live User Updates**: Real-time participant join/leave notifications
- **Chat System**: Bi-directional messaging between room participants with instant visibility
- **Role-based Access**: Organiser and participant roles with different permissions
- **Connection Status**: Visual indicators for WebSocket connection status

### 🚀 Collaborative Code Editor
- **Monaco Editor**: Professional code editor (same as VS Code)
- **Real-time Synchronization**: Code changes sync instantly across all participants
- **Multi-language Support**: JavaScript, TypeScript, Python, Java, C++, C#, PHP, Ruby, Go, Rust, HTML, CSS, JSON, SQL
- **Theme Support**: Dark, Light, and High Contrast themes
- **Code Execution**: 
  - JavaScript: Run directly in browser (sandboxed)
  - HTML: Preview in new tab
  - CSS: Apply to current page temporarily
  - JSON: Validation and formatting
  - Other languages: External compilation via Judge0 API
- **File Download**: Save code files locally
- **Syntax Highlighting**: Full syntax highlighting for all supported languages
- **Auto-completion**: Intelligent code suggestions and auto-completion
- **Error Handling**: Real-time error detection and reporting

### Authentication
- Email/Password authentication with bcrypt hashing
- JWT token-based authentication
- Session management for WebSocket connections
- Secure cookie handling
- Form validation and error handling
- Loading states and user feedback

### Database Schema
- **Users**: User accounts with email, password, and profile information
- **Rooms**: Room entities with unique codes and organiser references
- **RoomParticipants**: Junction table for user-room relationships with roles

## Tech Stack

### Frontend
- React 19 with Vite
- Tailwind CSS for styling
- Socket.IO Client for real-time communication
- Monaco Editor for collaborative coding
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
- RapidAPI account (for external compilation)

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

#### External Compilation Setup (Optional)
To enable code execution for languages other than JavaScript:

1. Sign up for a free account at [RapidAPI](https://rapidapi.com/)
2. Subscribe to the [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce)
3. Copy your API key from the RapidAPI dashboard
4. Update `frontend/src/config.js`:
```javascript
export const JUDGE0_CONFIG = {
  API_URL: 'https://judge0-ce.p.rapidapi.com',
  API_KEY: 'your-actual-api-key-here',
  HOST: 'judge0-ce.p.rapidapi.com'
};
```

Start the development server:
```bash
npm run dev
```

## WebSocket Events

### Client to Server
- `joinRoom(roomCode)` - Join a specific room
- `chatMessage(message)` - Send a chat message to room participants
- `codeChange(data)` - Send code changes to other participants
- `languageChange(data)` - Change programming language
- `themeChange(data)` - Change editor theme
- `cursorChange(data)` - Send cursor position updates

### Server to Client
- `roomJoined(data)` - Confirmation of successful room join with room data
- `userJoined(data)` - Notification when a new user joins the room
- `userLeft(data)` - Notification when a user leaves the room
- `chatMessage(data)` - Receive chat messages from other participants
- `codeChange(data)` - Receive code changes from other participants
- `languageChange(data)` - Receive language change notifications
- `themeChange(data)` - Receive theme change notifications
- `cursorChange(data)` - Receive cursor position updates
- `codeSync(data)` - Initial code synchronization for new users
- `error(data)` - Error notifications

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

### Collaborative Coding
1. **Real-time Editing**: Start typing code and see changes sync instantly
2. **Language Selection**: Choose from 14+ programming languages
3. **Theme Customization**: Switch between Dark, Light, and High Contrast themes
4. **Code Execution**: 
   - JavaScript: Run directly in browser
   - HTML: Preview in new tab
   - CSS: Apply temporarily to page
   - Other languages: Use external compilation (requires API key)
5. **File Management**: Download your code as files
6. **Chat Integration**: Discuss code changes in real-time chat

### Real-time Features
- **Live Participants**: See all connected users in real-time
- **Chat**: Send and receive messages with all room participants (including your own)
- **Code Sync**: Real-time code synchronization across all participants
- **Connection Status**: Monitor your WebSocket connection status
- **User Notifications**: Get notified when users join or leave

## Security Features

- **Authentication Required**: All WebSocket connections require valid session
- **Room Access Control**: Users can only join rooms they're participants in
- **JWT Token Validation**: Secure token-based authentication
- **Session Management**: Proper session handling for WebSocket connections
- **CORS Configuration**: Secure cross-origin resource sharing
- **Code Execution Sandbox**: Safe JavaScript execution environment

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
│   │   │   └── CollaborativeEditor.jsx  # Monaco Editor integration
│   │   ├── pages/       # Page components
│   │   └── config.js    # Configuration
│   └── package.json
└── README.md
```

### Key Implementation Details

#### WebSocket Authentication
The application uses JWT tokens for Socket.IO authentication. When users log in, both httpOnly and non-httpOnly cookies are set for secure HTTP requests and Socket.IO access respectively.

#### Collaborative Editor
- **Monaco Editor**: Professional-grade code editor with syntax highlighting
- **Real-time Sync**: Debounced code change synchronization (500ms)
- **Multi-language**: Support for 14+ programming languages
- **Theme Support**: Multiple editor themes
- **External Compilation**: Integration with Judge0 CE API for non-JavaScript languages

#### Chat System
- **Instant Visibility**: User's own messages appear immediately in local state
- **Real-time Sync**: Messages broadcast to all room participants
- **System Messages**: Automatic notifications for user join/leave events

#### Code Execution
- **JavaScript**: Sandboxed execution in browser
- **HTML/CSS**: Live preview capabilities
- **External Languages**: Compilation and execution via Judge0 CE API
- **Error Handling**: Comprehensive error reporting and status updates

## Troubleshooting

### Chat Messages Not Visible
- Ensure you're connected to the WebSocket server (green "Connected" status)
- Check browser console for any error messages
- Verify that the backend server is running

### Code Sync Issues
- Check WebSocket connection status
- Ensure all users are in the same room
- Verify that the backend is properly storing room states

### External Compilation Not Working
- Verify your RapidAPI key is correctly set in `frontend/src/config.js`
- Check that you're subscribed to the Judge0 CE API
- Ensure your API key has sufficient quota for the current month

### CORS Errors
- Verify that your frontend port is included in the backend CORS configuration
- Check that both frontend and backend are running on the expected ports
- Restart the backend server after making CORS changes 