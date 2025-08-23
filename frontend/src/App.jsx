import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import Landing from "./pages/Landing";
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <div>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/room/:id" element={<Room />} />
    </Routes>
      <Analytics />
    </div>
  );
}

export default App;