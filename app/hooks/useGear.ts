import { useEffect, useState } from "react";
import { CustomGear, GearSlot } from "../types";

export const useGear = () => {
  const [hydrated, setHydrated] = useState(false);

  const [customGears, setCustomGears] = useState<CustomGear[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("wwm_custom_gear");
    return saved ? JSON.parse(saved) : [];
  });

  const [equipped, setEquipped] = useState<
    Partial<Record<GearSlot, string>>
  >(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("wwm_equipped");
    return saved ? JSON.parse(saved) : {};
  });

  // mark hydration complete
  useEffect(() => {
    setHydrated(true);
  }, []);

  // persist ONLY after hydration
  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem("wwm_custom_gear", JSON.stringify(customGears));
    localStorage.setItem("wwm_equipped", JSON.stringify(equipped));
  }, [customGears, equipped, hydrated]);

  return { customGears, setCustomGears, equipped, setEquipped };
};
