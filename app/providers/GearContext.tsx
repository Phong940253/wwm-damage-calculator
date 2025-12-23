// app/gear/GearContext.tsx
"use client";

import { createContext, useContext } from "react";
import { useGear as useGearInternal } from "../hooks/useGear";

const GearContext = createContext<ReturnType<typeof useGearInternal> | null>(null);

export function GearProvider({ children }: { children: React.ReactNode }) {
  const gear = useGearInternal();
  return (
    <GearContext.Provider value={gear}>
      {children}
    </GearContext.Provider>
  );
}

export function useGear() {
  const ctx = useContext(GearContext);
  if (!ctx) {
    throw new Error("useGear must be used inside <GearProvider>");
  }
  return ctx;
}
