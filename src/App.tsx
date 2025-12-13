// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import GameRoom from "./screens/GameRoom";

const RoomRoute: React.FC = () => {
  const { roomId } = useParams();
  if (!roomId) return <Navigate to="/" replace />;
  return <GameRoom roomId={roomId} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/room/:roomId" element={<RoomRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
