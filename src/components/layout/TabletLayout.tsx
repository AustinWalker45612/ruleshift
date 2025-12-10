// src/layout/TabletLayout.tsx
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const TabletLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#020617",
        color: "#e5e7eb",
        padding: "16px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          borderRadius: 16,
          border: "1px solid #1f2937",
          background: "#020617",
          boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
          padding: 12,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
};
