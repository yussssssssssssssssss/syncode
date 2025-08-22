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

# Syncode

Lightweight README for running Syncode locally (frontend + backend).

This repository contains:

- `backend/` — Express + Socket.IO server (Prisma + PostgreSQL)
- `frontend/` — React + Vite frontend

## Quick start (development)

Prerequisites:
- Node.js 18+ and npm

1) Install dependencies

```bash
# backend
cd backend
npm install

# frontend (in a separate terminal)
cd frontend
npm install
```

2) Configure environment

- Copy `backend/env.example` -> `backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, etc.
- Ensure `frontend/src/config.js` (or `src/config.js`) points `BASE_URL` to your backend (e.g. `http://localhost:4000`).

3) (Optional) Prisma: generate client / run migrations

```bash
cd backend
npx prisma generate
# if you need to apply migrations locally
npx prisma migrate dev --name init
```

4) Run services

```bash
# start backend (dev)
cd backend && npm run dev

# start frontend (dev)
cd frontend && npm run dev
```

Open the URL printed by Vite (commonly `http://localhost:5173`).

## Scripts (summary)

- backend/package.json
  - `start` — node index.js
  - `dev` — nodemon index.js

- frontend/package.json
  - `dev` — vite
  - `build` — vite build
  - `preview` — vite preview

## Notes & tips

- If pages render with stale styles after edits, clear browser cache and hard-reload.
- If WebSocket connections fail, confirm backend is running and CORS/socket options allow the frontend origin.
- For production, build the frontend (`npm run build`) and host the `dist` output behind a static server or CDN.

If you want, I can add a root convenience script (e.g. `dev` that runs both frontend and backend with one command) or a Docker Compose file for local development.
