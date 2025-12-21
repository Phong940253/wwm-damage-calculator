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

      setElementStats((prev) => {
        const next = { ...prev };

        for (const key in prev) {
          if (key === "selected") {
            next.selected = saved.selected ?? prev.selected;
            continue;
          }

          if (saved[key] !== undefined) {
            next[key as keyof Omit<ElementStats, "selected">] = {
              ...prev[key as keyof Omit<ElementStats, "selected">],
              current: saved[key],
            };
          }
        }

        return next;
      });
    } catch {}
  }, []);

  return { elementStats, setElementStats };
};
