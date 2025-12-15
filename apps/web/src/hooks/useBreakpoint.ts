// src/hooks/useBreakpoint.ts
import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const getBreakpoint = (width: number): Breakpoint => {
  if (width < 768) return "mobile";
  if (width < 1200) return "tablet";
  return "desktop";
};

export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "desktop";
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
};
