// app/hooks/useGear.ts
import { useEffect, useState } from "react";
import { CustomGear, GearSlot } from "../types";

export const useGear = () => {
  // Initialize with empty values to match SSR
  const [customGears, setCustomGears] = useState<CustomGear[]>([]);
  const [equipped, setEquipped] = useState<Partial<Record<GearSlot, string>>>(
    {}
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const savedGears = localStorage.getItem("wwm_custom_gear");
    const savedEquipped = localStorage.getItem("wwm_equipped");

    if (savedGears) {
      const migrateGearSlot = (
        slot: GearSlot | "ring" | "talisman"
      ): GearSlot => {
        if (slot === "ring") return "disc";
        if (slot === "talisman") return "pendant";
        return slot;
      };

      // when loading gears
      setCustomGears(
        JSON.parse(savedGears).map((g: CustomGear) => ({
          ...g,
          slot: migrateGearSlot(g.slot),
        }))
      );
    }

    if (savedEquipped) {
      const parsed: Partial<Record<string, string>> = JSON.parse(savedEquipped);

      // 🔄 migrate old slot keys
      const migrated: Partial<Record<GearSlot, string>> = {
        ...parsed,
        disc: parsed.ring,
        pendant: parsed.talisman,
      };

      delete (migrated as any).ring;
      delete (migrated as any).talisman;

      setEquipped(migrated);
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
