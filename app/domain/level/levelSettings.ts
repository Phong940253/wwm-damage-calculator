export type LevelContext = {
  playerLevel: number;
  enemyLevel: number;
};

export const LEVEL_STORAGE_KEYS = {
  player: "wwm_player_level",
  enemy: "wwm_enemy_level",
} as const;

export const DEFAULT_LEVEL_CONTEXT: LevelContext = {
  playerLevel: 81,
  enemyLevel: 81,
};

// Level-scaling table (extend as the game adds more milestones)
const LEVEL_EFFECTS: Record<
  number,
  {
    bossResistancePct: number;
    playerDirectPrecisionPct: number;
  }
> = {
  71: { bossResistancePct: 0, playerDirectPrecisionPct: 8.5 },
  81: { bossResistancePct: 13, playerDirectPrecisionPct: 9.8 },
};

export const SUPPORTED_LEVELS = Object.keys(LEVEL_EFFECTS)
  .map((x) => Number(x))
  .filter((x) => Number.isFinite(x))
  .sort((a, b) => a - b);

export function getBossResistancePct(enemyLevel: number): number {
  return LEVEL_EFFECTS[enemyLevel]?.bossResistancePct ?? 0;
}

export function getPlayerDirectPrecisionPct(playerLevel: number): number {
  return LEVEL_EFFECTS[playerLevel]?.playerDirectPrecisionPct ?? 0;
}

export function clampToSupportedLevel(level: number): number {
  if (!Number.isFinite(level)) return DEFAULT_LEVEL_CONTEXT.playerLevel;
  if (SUPPORTED_LEVELS.length === 0) return Math.round(level);
  if (SUPPORTED_LEVELS.includes(level)) return level;
  // Fallback: keep current default until more levels are added.
  return DEFAULT_LEVEL_CONTEXT.playerLevel;
}

function safeParseStoredNumber(raw: string | null): number | null {
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return v;
}

export function getStoredLevelContext(): LevelContext {
  // SSR / worker-safe fallback
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_LEVEL_CONTEXT;
  }

  const storedPlayer = safeParseStoredNumber(
    window.localStorage.getItem(LEVEL_STORAGE_KEYS.player),
  );
  const storedEnemy = safeParseStoredNumber(
    window.localStorage.getItem(LEVEL_STORAGE_KEYS.enemy),
  );

  return {
    playerLevel: clampToSupportedLevel(
      storedPlayer ?? DEFAULT_LEVEL_CONTEXT.playerLevel,
    ),
    enemyLevel: clampToSupportedLevel(
      storedEnemy ?? DEFAULT_LEVEL_CONTEXT.enemyLevel,
    ),
  };
}

export function setStoredLevelContext(next: Partial<LevelContext>) {
  if (typeof window === "undefined" || !window.localStorage) return;

  if (typeof next.playerLevel === "number") {
    window.localStorage.setItem(
      LEVEL_STORAGE_KEYS.player,
      String(clampToSupportedLevel(next.playerLevel)),
    );
  }

  if (typeof next.enemyLevel === "number") {
    window.localStorage.setItem(
      LEVEL_STORAGE_KEYS.enemy,
      String(clampToSupportedLevel(next.enemyLevel)),
    );
  }

  // Notify in-tab listeners (storage event doesn't fire in the same tab).
  try {
    window.dispatchEvent(new Event("wwm_level_context_changed"));
  } catch {
    // ignore
  }
}
