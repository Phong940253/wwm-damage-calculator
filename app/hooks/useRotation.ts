// app/hooks/useRotation.ts
import { useEffect, useState } from "react";
import { Rotation, RotationSkill } from "../types";
import { DEFAULT_ROTATIONS } from "@/app/domain/rotation/defaultRotations";
import { PASSIVE_SKILLS } from "@/app/domain/skill/passiveSkills";
import { INNER_WAYS } from "@/app/domain/skill/innerWays";
import { MartialArtId } from "@/app/domain/skill/types";

const STORAGE_KEY = "wwm_rotations";
const STORAGE_SELECTED_ID_KEY = "wwm_rotations_selected_id";

// Backward compatibility for older saves that reference removed/renamed Inner Way ids.
const INNER_WAY_ID_ALIASES: Record<string, string> = {
  // Old id -> new id
  iw_star_reacher: "iw_silkbind_star_reacher",
};

const INNER_BY_ID = new Map(INNER_WAYS.map((iw) => [iw.id, iw] as const));
const INNER_GROUP_IDS = (() => {
  const groupToIds = new Map<string, string[]>();
  for (const iw of INNER_WAYS) {
    const gid = iw.tierGroupId;
    if (!gid) continue;
    const arr = groupToIds.get(gid) ?? [];
    arr.push(iw.id);
    groupToIds.set(gid, arr);
  }
  return groupToIds;
})();

function collapseInnerWayTiers(activeIds: string[]): string[] {
  if (!activeIds || activeIds.length === 0) return [];

  const active = new Set(activeIds);

  for (const [groupId, ids] of INNER_GROUP_IDS.entries()) {
    const enabledInGroup = ids
      .filter((id) => active.has(id))
      .map((id) => INNER_BY_ID.get(id))
      .filter(Boolean) as NonNullable<(typeof INNER_WAYS)[number]>[];

    if (enabledInGroup.length <= 1) continue;

    // Keep the highest tier/level. If level is missing, treat as 0.
    enabledInGroup.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    const keep = enabledInGroup[enabledInGroup.length - 1]!.id;

    for (const id of ids) active.delete(id);
    active.add(keep);
  }

  // Preserve original-ish ordering: keep ids that remain, in input order, plus any kept ids.
  const out: string[] = [];
  for (const id of activeIds) {
    if (active.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of active) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function makeDuplicateName(existingNames: Set<string>, baseName: string) {
  const trimmed = baseName.trim();
  const base = trimmed.length > 0 ? trimmed : "Rotation";

  const preferred = `${base} (Copy)`;
  if (!existingNames.has(preferred)) return preferred;

  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base} (Copy ${i})`;
    if (!existingNames.has(candidate)) return candidate;
  }

  // Extremely unlikely, but guarantees we always return a name.
  return `${base} (Copy ${Date.now()})`;
}

/**
 * Normalize rotation: ensure activePassiveSkills & activeInnerWays exist
 */
function normalizeRotation(
  rotation: Rotation,
  martialArtId?: MartialArtId,
): Rotation {
  const hadActivePassiveSkillsField = Array.isArray(
    rotation.activePassiveSkills,
  );
  const hadActiveInnerWaysField = Array.isArray(rotation.activeInnerWays);

  // Important: do not mutate the input object (e.g. DEFAULT_ROTATIONS entries).
  // We clone the shallow structure + key nested collections that we modify.
  const next: Rotation = {
    ...rotation,
    skills: (rotation.skills ?? []).map((s) => ({
      ...s,
      params: s.params ? { ...s.params } : undefined,
    })),
    activePassiveSkills: hadActivePassiveSkillsField
      ? [...rotation.activePassiveSkills]
      : [],
    activeInnerWays: hadActiveInnerWaysField
      ? [...rotation.activeInnerWays].map(
          (id) => INNER_WAY_ID_ALIASES[id] ?? id,
        )
      : [],
    passiveUptimes: rotation.passiveUptimes
      ? { ...rotation.passiveUptimes }
      : {},
  };

  const allPassiveIds = new Set(PASSIVE_SKILLS.map((p) => p.id));
  const allInnerWayIds = new Set(INNER_WAYS.map((i) => i.id));

  const isInnerWayAllowed = (innerId: string) => {
    const iw = INNER_WAYS.find((x) => x.id === innerId);
    if (!iw) return false;

    // Martial-art specific inner way: only allowed for matching MA
    if (iw.applicableToMartialArtId) {
      return !!martialArtId && iw.applicableToMartialArtId === martialArtId;
    }

    // Universal inner way: allowed for all martial arts.
    // If defaultEnabledForMartialArtIds is provided, treat it as an allow-list.
    if (iw.defaultEnabledForMartialArtIds) {
      return (
        !!martialArtId &&
        iw.defaultEnabledForMartialArtIds.includes(martialArtId)
      );
    }
    return true;
  };

  const defaultInnerWayIds = INNER_WAYS.filter((iw) => {
    if (iw.applicableToMartialArtId) {
      return !!martialArtId && iw.applicableToMartialArtId === martialArtId;
    }
    if (iw.defaultEnabledForMartialArtIds) {
      return (
        !!martialArtId &&
        iw.defaultEnabledForMartialArtIds.includes(martialArtId)
      );
    }
    return true;
  }).map((iw) => iw.id);

  const defaultInnerWayIdsCollapsed = collapseInnerWayTiers(defaultInnerWayIds);

  const defaultPassiveIdsForMA = martialArtId
    ? PASSIVE_SKILLS.filter((p) => {
        if (p.martialArtId === martialArtId) return true;
        if (
          !p.martialArtId &&
          p.defaultEnabledForMartialArtIds?.includes(martialArtId)
        ) {
          return true;
        }
        return false;
      }).map((p) => p.id)
    : [];

  // Initialize/sanitize activePassiveSkills
  if (!hadActivePassiveSkillsField) {
    next.activePassiveSkills = martialArtId ? defaultPassiveIdsForMA : [];
  } else {
    next.activePassiveSkills = next.activePassiveSkills.filter((id) =>
      allPassiveIds.has(id),
    );

    // If rotation is tied to a martial art and all passives were removed, enable current defaults
    if (martialArtId && next.activePassiveSkills.length === 0) {
      next.activePassiveSkills = defaultPassiveIdsForMA;
    }
  }

  // Initialize/sanitize activeInnerWays - enable all by default
  const looksLikeNewRotationWithPlaceholderEmptyList =
    hadActiveInnerWaysField &&
    rotation.activeInnerWays.length === 0 &&
    typeof rotation.createdAt === "number" &&
    typeof rotation.updatedAt === "number" &&
    rotation.createdAt === rotation.updatedAt;

  const hadExplicitInnerWays =
    hadActiveInnerWaysField && !looksLikeNewRotationWithPlaceholderEmptyList;
  if (!hadExplicitInnerWays) {
    // Migration/default: if older saves didn't have this field, enable defaults.
    next.activeInnerWays = defaultInnerWayIdsCollapsed;
  } else {
    const originalLength = rotation.activeInnerWays.length;

    next.activeInnerWays = (next.activeInnerWays ?? []).filter(
      (id) => allInnerWayIds.has(id) && isInnerWayAllowed(id),
    );

    // Migration: old saves could enable multiple tiers; keep only the selected tier per group.
    next.activeInnerWays = collapseInnerWayTiers(next.activeInnerWays);

    // If the user explicitly saved an empty list, keep it empty.
    // If it became empty due to invalid/removed ids, fall back to defaults.
    if (next.activeInnerWays.length === 0 && originalLength > 0) {
      next.activeInnerWays = defaultInnerWayIdsCollapsed;
    }
  }

  // Initialize/sanitize passiveUptimes (0..100)
  const defaultUptimeFor = (passiveId: string) => {
    const p = PASSIVE_SKILLS.find((x) => x.id === passiveId);
    const raw =
      typeof p?.defaultUptimePercent === "number"
        ? p.defaultUptimePercent
        : 100;
    return Math.round(raw);
  };

  const passiveUptimes = (next.passiveUptimes ??= {});

  // Remove unknown keys
  for (const key of Object.keys(passiveUptimes)) {
    if (!allPassiveIds.has(key)) delete passiveUptimes[key];
  }

  // Ensure each active passive has an uptime
  for (const passiveId of next.activePassiveSkills) {
    const v = passiveUptimes[passiveId];
    if (typeof v !== "number" || Number.isNaN(v)) {
      passiveUptimes[passiveId] = defaultUptimeFor(passiveId);
      continue;
    }
    passiveUptimes[passiveId] = Math.round(Math.min(100, Math.max(0, v)));
  }

  return next;
}

export const useRotation = () => {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [selectedRotationId, setSelectedRotationId] = useState<string>("");

  // Load từ localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedSelectedId = localStorage.getItem(STORAGE_SELECTED_ID_KEY) || "";
    let savedRotations: Rotation[] = [];

    if (raw) {
      try {
        savedRotations = JSON.parse(raw) as Rotation[];
      } catch {
        // Fallback to default only
        const normalized = DEFAULT_ROTATIONS.map((r) =>
          normalizeRotation(r, r.martialArtId as MartialArtId),
        );
        setRotations(normalized);
        setSelectedRotationId(savedSelectedId || normalized[0].id);
        return;
      }
    }

    // Merge default rotations with saved rotations.
    // IMPORTANT: default rotations are treated as immutable templates.
    // If a saved rotation has the same id as a default rotation, we always prefer
    // the current DEFAULT_ROTATIONS version (so defaults can be updated over time).
    const defaultIds = new Set(DEFAULT_ROTATIONS.map((r) => r.id));
    const uniqueSaved = savedRotations.filter((r) => !defaultIds.has(r.id));

    const mergedRotations = [...DEFAULT_ROTATIONS, ...uniqueSaved].map((r) =>
      normalizeRotation(r, r.martialArtId as MartialArtId),
    );

    setRotations(mergedRotations);

    const exists = mergedRotations.some((r) => r.id === savedSelectedId);
    setSelectedRotationId(
      exists ? savedSelectedId : (mergedRotations[0]?.id ?? ""),
    );
  }, []);

  // Persist vào localStorage mỗi khi rotations thay đổi
  useEffect(() => {
    if (rotations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rotations));
    }
  }, [rotations]);

  // Persist selected rotation id
  useEffect(() => {
    if (selectedRotationId) {
      localStorage.setItem(STORAGE_SELECTED_ID_KEY, selectedRotationId);
    }
  }, [selectedRotationId]);

  const selectedRotation = rotations.find((r) => r.id === selectedRotationId);

  const createRotation = (name: string, martialArtId?: MartialArtId) => {
    const newRotation: Rotation = {
      id: generateId(),
      name,
      martialArtId,
      skills: [],
      activePassiveSkills: [],
      // Let normalizeRotation decide defaults (e.g. Battle Anthem only for bellstrike_splendor)
      activeInnerWays: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const normalized = normalizeRotation(newRotation, martialArtId);
    setRotations((prev) => [...prev, normalized]);
    setSelectedRotationId(normalized.id);
    return normalized;
  };

  const duplicateRotation = (id: string) => {
    const source = rotations.find((r) => r.id === id);
    if (!source) return;

    const now = Date.now();
    const existingNames = new Set(rotations.map((r) => r.name));
    const name = makeDuplicateName(existingNames, source.name);

    const copiedSkills = [...(source.skills ?? [])]
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({
        ...s,
        entryId: generateId(),
        order: idx,
        params: s.params ? { ...s.params } : undefined,
      }));

    const next: Rotation = {
      ...source,
      id: generateId(),
      name,
      skills: copiedSkills,
      activePassiveSkills: [...(source.activePassiveSkills ?? [])],
      passiveUptimes: source.passiveUptimes ? { ...source.passiveUptimes } : {},
      activeInnerWays: [...(source.activeInnerWays ?? [])],
      createdAt: now,
      updatedAt: now,
    };

    const normalized = normalizeRotation(
      next,
      source.martialArtId as MartialArtId,
    );
    setRotations((prev) => [...prev, normalized]);
    setSelectedRotationId(normalized.id);
  };

  const deleteRotation = (id: string) => {
    setRotations((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (selectedRotationId === id) {
        setSelectedRotationId(next[0]?.id ?? "");
      }
      return next;
    });
  };

  const renameRotation = (id: string, newName: string) => {
    setRotations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, name: newName, updatedAt: Date.now() } : r,
      ),
    );
  };

  const addSkillToRotation = (rotationId: string, skillId: string) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const newSkill: RotationSkill = {
          entryId: generateId(),
          id: skillId,
          order: r.skills.length,
          count: 1, // mặc định 1 lần sử dụng
        };
        return {
          ...r,
          skills: [...r.skills, newSkill],
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const removeSkillFromRotation = (rotationId: string, entryId: string) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const filtered = r.skills.filter((s) => s.entryId !== entryId);
        // Reorder skills
        const reordered = filtered.map((s, idx) => ({
          ...s,
          order: idx,
        }));
        return {
          ...r,
          skills: reordered,
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const moveSkill = (
    rotationId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const newSkills = [...r.skills];
        const [movedSkill] = newSkills.splice(fromIndex, 1);
        newSkills.splice(toIndex, 0, movedSkill);

        // Reorder
        const reordered = newSkills.map((s, idx) => ({
          ...s,
          order: idx,
        }));

        return {
          ...r,
          skills: reordered,
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const updateSkillCount = (
    rotationId: string,
    entryId: string,
    count: number,
  ) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        return {
          ...r,
          skills: r.skills.map((s) =>
            s.entryId === entryId ? { ...s, count: Math.max(1, count) } : s,
          ),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const updateSkillParams = (
    rotationId: string,
    entryId: string,
    patch: Record<string, number>,
  ) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        return {
          ...r,
          skills: r.skills.map((s) => {
            if (s.entryId !== entryId) return s;
            const nextParams = { ...(s.params ?? {}), ...patch };
            return { ...s, params: nextParams };
          }),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const togglePassiveSkill = (rotationId: string, passiveId: string) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const isActive = r.activePassiveSkills.includes(passiveId);
        const nextUptimes = { ...(r.passiveUptimes || {}) };

        if (!isActive) {
          // When enabling, ensure there is an uptime value
          const p = PASSIVE_SKILLS.find((x) => x.id === passiveId);
          const def =
            typeof p?.defaultUptimePercent === "number"
              ? Math.round(p.defaultUptimePercent)
              : 100;
          if (typeof nextUptimes[passiveId] !== "number")
            nextUptimes[passiveId] = def;
        }

        return {
          ...r,
          activePassiveSkills: isActive
            ? r.activePassiveSkills.filter((p) => p !== passiveId)
            : [...r.activePassiveSkills, passiveId],
          passiveUptimes: nextUptimes,
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const updatePassiveUptime = (
    rotationId: string,
    passiveId: string,
    uptimePercent: number,
  ) => {
    const v = Math.round(Math.min(100, Math.max(0, uptimePercent)));
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;
        return {
          ...r,
          passiveUptimes: { ...(r.passiveUptimes || {}), [passiveId]: v },
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const toggleInnerWay = (rotationId: string, innerId: string) => {
    const iw = INNER_BY_ID.get(innerId);
    const tierGroupId = iw?.tierGroupId;

    // If this is a tiered inner way, toggling it means selecting/deselecting that tier.
    if (tierGroupId) {
      const groupIds = INNER_GROUP_IDS.get(tierGroupId) ?? [];
      setRotations((prev) =>
        prev.map((r) => {
          if (r.id !== rotationId) return r;
          const isActive = r.activeInnerWays.includes(innerId);
          const nextActive = r.activeInnerWays.filter(
            (id) => !groupIds.includes(id),
          );
          if (!isActive) nextActive.push(innerId);

          return {
            ...r,
            activeInnerWays: collapseInnerWayTiers(nextActive),
            updatedAt: Date.now(),
          };
        }),
      );
      return;
    }

    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const isActive = r.activeInnerWays.includes(innerId);
        return {
          ...r,
          activeInnerWays: isActive
            ? r.activeInnerWays.filter((i) => i !== innerId)
            : [...r.activeInnerWays, innerId],
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const setInnerWayTier = (
    rotationId: string,
    tierGroupId: string,
    innerWayId: string | null,
  ) => {
    const groupIds = INNER_GROUP_IDS.get(tierGroupId) ?? [];

    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const nextActive = r.activeInnerWays.filter(
          (id) => !groupIds.includes(id),
        );

        if (innerWayId) nextActive.push(innerWayId);

        return {
          ...r,
          activeInnerWays: collapseInnerWayTiers(nextActive),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  return {
    rotations,
    selectedRotationId,
    selectedRotation,
    setSelectedRotationId,
    createRotation,
    duplicateRotation,
    deleteRotation,
    renameRotation,
    addSkillToRotation,
    removeSkillFromRotation,
    moveSkill,
    updateSkillCount,
    updateSkillParams,
    togglePassiveSkill,
    toggleInnerWay,
    setInnerWayTier,
    updatePassiveUptime,
  };
};
