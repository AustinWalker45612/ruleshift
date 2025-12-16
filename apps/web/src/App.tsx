// src/App.tsx
import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Profile from "./pages/Profile";
import GameRoom from "./screens/GameRoom";

// -------------------- Room Wrapper --------------------
const RoomRoute: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) return <Navigate to="/" replace />;
  return <GameRoom roomId={roomId} />;
};

// -------------------- App --------------------
const App: React.FC = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Auth-required (cookie-based, backend enforces auth) */}
      <Route path="/profile" element={<Profile />} />

      {/* Game */}
      <Route path="/room/:roomId" element={<RoomRoute />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
