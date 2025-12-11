// src/components/layout/MobileLayout.tsx
import React from "react";

type MobileLayoutProps = {
  children: React.ReactNode;
};

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        // Keep everything within a comfortable phone width
        width: "100%",
        maxWidth: 520,               // good for big phones but not “tablet”
        margin: "0 auto",
        boxSizing: "border-box",

        // Mobile-friendly padding
        padding: "10px 10px 24px",

        // Slight gap between stacked sections
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
};

export default MobileLayout;
