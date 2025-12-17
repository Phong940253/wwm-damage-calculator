import { useEffect, useState } from "react";
import { CustomGear, GearSlot } from "../types";

export const useGear = () => {
  const [customGears, setCustomGears] = useState<CustomGear[]>([]);
  const [equipped, setEquipped] = useState<
    Partial<Record<GearSlot, string>>
  >({});

  useEffect(() => {
    localStorage.setItem("wwm_custom_gear", JSON.stringify(customGears));
    localStorage.setItem("wwm_equipped", JSON.stringify(equipped));
  }, [customGears, equipped]);

  return { customGears, setCustomGears, equipped, setEquipped };
};
