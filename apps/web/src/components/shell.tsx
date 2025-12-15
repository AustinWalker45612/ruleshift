// src/components/shell.tsx
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
};

export const Shell: React.FC<Props> = ({
  title,
  subtitle,
  rightActions,
  children,
  maxWidth = 720,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        padding: "16px clamp(12px, 4vw, 32px)",
        boxSizing: "border-box",
        background: "#0f172a",
        color: "#e5e7eb",
      }}
    >
      <div style={{ width: "100%", maxWidth, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(34px, 4.2vw, 48px)",
                letterSpacing: 0.2,
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.75 }}>
                {subtitle}
              </p>
            ) : null}
          </div>

          {rightActions ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {rightActions}
            </div>
          ) : null}
        </header>

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
            padding: "18px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
