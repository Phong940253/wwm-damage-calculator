import { useEffect, useState } from "react";
import { InputStats } from "../types";

const STORAGE_KEY = "wwm_dmg_current_stats";

export const useStats = (initial: InputStats) => {
  const [stats, setStats] = useState<InputStats>(initial);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      setStats(prev =>
        Object.fromEntries(
          Object.entries(prev).map(([k, v]) => [
            k,
            { ...v, current: saved[k] ?? v.current },
          ])
        )
      );
    } catch {}
  }, []);

  return { stats, setStats };
};
