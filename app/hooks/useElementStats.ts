// app/hooks/useElementStats.ts
import { useEffect, useState } from "react";
import { ElementStats } from "../types";

const STORAGE_KEY = "wwm_element_stats";

export const useElementStats = (initial: ElementStats) => {
  const [elementStats, setElementStats] = useState<ElementStats>(initial);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

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
  }, []);

  return { elementStats, setElementStats };
};
