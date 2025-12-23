// app/hooks/useGear.ts
import { useEffect, useState } from "react";
import { CustomGear, GearSlot } from "../types";

export const useGear = () => {
  // Initialize with empty values to match SSR
  const [customGears, setCustomGears] = useState<CustomGear[]>([]);
  const [equipped, setEquipped] = useState<Partial<Record<GearSlot, string>>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const savedGears = localStorage.getItem("wwm_custom_gear");
    const savedEquipped = localStorage.getItem("wwm_equipped");

    if (savedGears) {
      setCustomGears(JSON.parse(savedGears));
    }
    if (savedEquipped) {
      setEquipped(JSON.parse(savedEquipped));
    }
    
    setIsLoaded(true);
  }, []);

  // Persist to localStorage after initial load
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem("wwm_custom_gear", JSON.stringify(customGears));
    localStorage.setItem("wwm_equipped", JSON.stringify(equipped));
  }, [customGears, equipped, isLoaded]);

  return { customGears, setCustomGears, equipped, setEquipped };
};
