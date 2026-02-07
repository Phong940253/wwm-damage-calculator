import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LEVEL_CONTEXT,
  getStoredLevelContext,
  setStoredLevelContext,
  type LevelContext,
} from "@/app/domain/level/levelSettings";

export function useLevelContext() {
  const [levelContext, setLevelContext] = useState<LevelContext>(
    DEFAULT_LEVEL_CONTEXT,
  );

  useEffect(() => {
    setLevelContext(getStoredLevelContext());

    const onAnyChange = () => setLevelContext(getStoredLevelContext());

    window.addEventListener("storage", onAnyChange);
    window.addEventListener("wwm_level_context_changed", onAnyChange);
    return () => {
      window.removeEventListener("storage", onAnyChange);
      window.removeEventListener("wwm_level_context_changed", onAnyChange);
    };
  }, []);

  const setPlayerLevel = useCallback((playerLevel: number) => {
    setStoredLevelContext({ playerLevel });
    setLevelContext(getStoredLevelContext());
  }, []);

  const setEnemyLevel = useCallback((enemyLevel: number) => {
    setStoredLevelContext({ enemyLevel });
    setLevelContext(getStoredLevelContext());
  }, []);

  return {
    levelContext,
    setPlayerLevel,
    setEnemyLevel,
  };
}
