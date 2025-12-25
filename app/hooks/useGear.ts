// app/hooks/useGear.ts
import { useEffect, useState } from "react";
import { CustomGear, GearSlot } from "../types";

/* =======================
   Slot migration helpers
======================= */

type LegacyGearSlot = GearSlot | "ring" | "talisman";

function migrateGearSlot(slot: LegacyGearSlot): GearSlot {
  if (slot === "ring") return "disc";
  if (slot === "talisman") return "pendant";
  return slot;
}

function migrateEquipped(
  raw: Partial<Record<string, string>>
): Partial<Record<GearSlot, string>> {
  const result: Partial<Record<GearSlot, string>> = {};

  Object.entries(raw).forEach(([key, value]) => {
    const slot = migrateGearSlot(key as LegacyGearSlot);
    if (value) {
      result[slot] = value;
    }
  });

  return result;
}

/* =======================
   Hook
======================= */

export const useGear = () => {
  const [customGears, setCustomGears] = useState<CustomGear[]>([]);
  const [equipped, setEquipped] = useState<Partial<Record<GearSlot, string>>>(
    {}
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage (client only)
  useEffect(() => {
    const savedGears = localStorage.getItem("wwm_custom_gear");
    const savedEquipped = localStorage.getItem("wwm_equipped");

    if (savedGears) {
      const parsed = JSON.parse(savedGears) as CustomGear[];

      setCustomGears(
        parsed.map((g) => ({
          ...g,
          slot: migrateGearSlot(g.slot),
        }))
      );
    }

    if (savedEquipped) {
      const parsed = JSON.parse(savedEquipped) as Partial<
        Record<string, string>
      >;

      setEquipped(migrateEquipped(parsed));
    }

    setIsLoaded(true);
  }, []);

  // Persist after initial load
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem("wwm_custom_gear", JSON.stringify(customGears));
    localStorage.setItem("wwm_equipped", JSON.stringify(equipped));
  }, [customGears, equipped, isLoaded]);

  return { customGears, setCustomGears, equipped, setEquipped };
};
