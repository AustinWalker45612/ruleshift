// src/layout/MobileLayout.tsx
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const MobileLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#020617",
        color: "#e5e7eb",
        padding: "12px 10px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          borderRadius: 12,
          border: "1px solid #111827",
          background: "#020617",
          boxShadow: "0 14px 32px rgba(0,0,0,0.7)",
          padding: 10,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
};
