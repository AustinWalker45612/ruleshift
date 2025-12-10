// src/layout/DesktopLayout.tsx
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const DesktopLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#0f172a", // slate-900
        color: "#e5e7eb",
        padding: "24px 32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          borderRadius: 16,
          border: "1px solid #1f2937",
          background: "radial-gradient(circle at top, #020617, #020617 40%, #020617)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.75)",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
};
