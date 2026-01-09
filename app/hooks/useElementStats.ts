// app/hooks/useElementStats.ts
import { useEffect, useState } from "react";
import { ElementStats } from "../types";

const STORAGE_KEY = "wwm_element_stats";

export const useElementStats = (initial: ElementStats) => {
  const [elementStats, setElementStats] = useState<ElementStats>(initial);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsHydrated(true);
      return;
    }

    try {
      const saved = JSON.parse(raw);
      saved.MainElementMultiplier = 100;

      setElementStats((prev) => {
        const next = { ...prev };

        for (const key in prev) {
          if (key === "selected") {
            next.selected = saved.selected ?? prev.selected;
            continue;
          }

          if (key === "martialArtsId") {
            next.martialArtsId = saved.martialArtsId ?? prev.martialArtsId;
            continue;
          }

          const value = prev[key as keyof ElementStats];
          const savedValue = saved[key];

          // Only spread object-like stats with current/increase
          if (
            savedValue !== undefined &&
            typeof value === "object" &&
            value !== null &&
            "current" in value
          ) {
            (next as Record<string, unknown>)[key] = {
              ...(value as { current: number | ""; increase: number | "" }),
              current: savedValue,
            };
          }
        }

        return next;
      });
    } catch {}

    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever elementStats changes (but skip initial load)
  useEffect(() => {
    if (!isHydrated) return;

    const toSave: Record<string, unknown> = {};

    for (const key in elementStats) {
      const value = elementStats[key as keyof ElementStats];
      if (key === "selected" || key === "martialArtsId") {
        toSave[key] = value;
      } else if (
        typeof value === "object" &&
        value !== null &&
        "current" in value
      ) {
        toSave[key] = (value as { current: number | "" }).current;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [elementStats, isHydrated]);

  return { elementStats, setElementStats };
};
