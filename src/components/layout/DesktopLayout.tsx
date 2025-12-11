// src/components/layout/DesktopLayout.tsx
import React from "react";

type DesktopLayoutProps = {
  children: React.ReactNode;
};

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        // Centers the whole app content on large screens
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        boxSizing: "border-box",

        // Give desktop a bit more structure / spacing
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 24,
      }}
    >
      {children}
    </div>
  );
};

export default DesktopLayout;
