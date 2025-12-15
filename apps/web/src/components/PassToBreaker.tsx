import React from "react";

type PassToBreakerProps = {
  breakerName: string;
  onContinue: () => void;
};

const PassToBreaker: React.FC<PassToBreakerProps> = ({
  breakerName,
  onContinue,
}) => {
  return (
    <div
      style={{
        background: "#111827",
        padding: 16,
        borderRadius: 12,
        textAlign: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
      }}
    >
      <h2 style={{ marginBottom: 8 }}>Pass the device</h2>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        Hand the device to <strong>{breakerName}</strong>. They are the BREAKER
        this round.
      </p>
      <button
        onClick={onContinue}
        style={{
          padding: "10px 24px",
          borderRadius: 999,
          border: "none",
          fontWeight: 600,
          cursor: "pointer",
          background: "#2563eb",
          color: "#e5e7eb",
        }}
      >
        It&apos;s {breakerName}&apos;s Turn
      </button>
    </div>
  );
};

export default PassToBreaker;
