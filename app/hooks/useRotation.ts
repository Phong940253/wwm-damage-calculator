// app/hooks/useRotation.ts
import { useEffect, useState } from "react";
import { Rotation, RotationSkill } from "../types";
import { DEFAULT_ROTATIONS } from "@/app/domain/rotation/defaultRotations";
import { PASSIVE_SKILLS } from "@/app/domain/skill/passiveSkills";
import { INNER_WAYS } from "@/app/domain/skill/innerWays";
import { MartialArtId } from "@/app/domain/skill/types";

const STORAGE_KEY = "wwm_rotations";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Normalize rotation: ensure activePassiveSkills & activeInnerWays exist
 */
function normalizeRotation(
  rotation: Rotation,
  martialArtId?: MartialArtId
): Rotation {
  const allPassiveIds = new Set(PASSIVE_SKILLS.map((p) => p.id));
  const allInnerWayIds = new Set(INNER_WAYS.map((i) => i.id));

  const isInnerWayAllowed = (innerId: string) => {
    const iw = INNER_WAYS.find((x) => x.id === innerId);
    if (!iw) return false;

    // Martial-art specific inner way: only allowed for matching MA
    if (iw.applicableToMartialArtId) {
      return !!martialArtId && iw.applicableToMartialArtId === martialArtId;
    }

    // Universal inner way: allowed for all
    return true;
  };

  const isInnerWayDefaultEnabled = (innerId: string) => {
    const iw = INNER_WAYS.find((x) => x.id === innerId);
    if (!iw) return false;

    if (!isInnerWayAllowed(innerId)) return false;

    // If it specifies a default-enabled list, only enable for those MAs
    if (iw.defaultEnabledForMartialArtIds) {
      return !!martialArtId && iw.defaultEnabledForMartialArtIds.includes(martialArtId);
    }

    // Otherwise enabled by default
    return true;
  };

  const defaultInnerWayIds = INNER_WAYS.filter((iw) => {
    if (iw.applicableToMartialArtId) {
      return !!martialArtId && iw.applicableToMartialArtId === martialArtId;
    }
    if (iw.defaultEnabledForMartialArtIds) {
      return !!martialArtId && iw.defaultEnabledForMartialArtIds.includes(martialArtId);
    }
    return true;
  }).map((iw) => iw.id);

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
  if (!rotation.activePassiveSkills) {
    rotation.activePassiveSkills = martialArtId ? defaultPassiveIdsForMA : [];
  } else {
    rotation.activePassiveSkills = rotation.activePassiveSkills.filter((id) =>
      allPassiveIds.has(id)
    );

    // If rotation is tied to a martial art and all passives were removed, enable current defaults
    if (martialArtId && rotation.activePassiveSkills.length === 0) {
      rotation.activePassiveSkills = defaultPassiveIdsForMA;
    }
  }

  // Initialize/sanitize activeInnerWays - enable all by default
  if (!rotation.activeInnerWays) {
    rotation.activeInnerWays = defaultInnerWayIds;
  } else {
    rotation.activeInnerWays = rotation.activeInnerWays.filter(
      (id) => allInnerWayIds.has(id) && isInnerWayAllowed(id)
    );

    if (rotation.activeInnerWays.length === 0) {
      rotation.activeInnerWays = defaultInnerWayIds;
    } else {
      // Backward-compat: if new inner ways were added later, enable them by default
      // ONLY if they are default-enabled for this martial art.
      const enabled = new Set(rotation.activeInnerWays);
      for (const id of defaultInnerWayIds) {
        if (!enabled.has(id) && isInnerWayDefaultEnabled(id)) {
          rotation.activeInnerWays.push(id);
        }
      }
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

  if (!rotation.passiveUptimes) rotation.passiveUptimes = {};

  // Remove unknown keys
  for (const key of Object.keys(rotation.passiveUptimes)) {
    if (!allPassiveIds.has(key)) delete rotation.passiveUptimes[key];
  }

  // Ensure each active passive has an uptime
  for (const passiveId of rotation.activePassiveSkills) {
    const v = rotation.passiveUptimes[passiveId];
    if (typeof v !== "number" || Number.isNaN(v)) {
      rotation.passiveUptimes[passiveId] = defaultUptimeFor(passiveId);
      continue;
    }
    rotation.passiveUptimes[passiveId] = Math.round(
      Math.min(100, Math.max(0, v))
    );
  }

  return rotation;
}

export const useRotation = () => {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [selectedRotationId, setSelectedRotationId] = useState<string>("");

  // Load từ localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    let savedRotations: Rotation[] = [];

    if (raw) {
      try {
        savedRotations = JSON.parse(raw) as Rotation[];
      } catch {
        // Fallback to default only
        const normalized = DEFAULT_ROTATIONS.map((r) =>
          normalizeRotation(r, r.martialArtId as MartialArtId)
        );
        setRotations(normalized);
        setSelectedRotationId(normalized[0].id);
        return;
      }
    }

    // Merge default rotations with saved rotations
    // Keep saved rotations that aren't already in defaults
    const defaultIds = new Set(DEFAULT_ROTATIONS.map((r) => r.id));
    const uniqueSaved = savedRotations.filter((r) => !defaultIds.has(r.id));
    const mergedRotations = [...DEFAULT_ROTATIONS, ...uniqueSaved].map((r) =>
      normalizeRotation(r, r.martialArtId as MartialArtId)
    );

    setRotations(mergedRotations);
    setSelectedRotationId(DEFAULT_ROTATIONS[0].id);
  }, []);

  // Persist vào localStorage mỗi khi rotations thay đổi
  useEffect(() => {
    if (rotations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rotations));
    }
  }, [rotations]);

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

  const deleteRotation = (id: string) => {
    setRotations((prev) => prev.filter((r) => r.id !== id));
    if (selectedRotationId === id) {
      setSelectedRotationId(rotations[0]?.id ?? "");
    }
  };

  const renameRotation = (id: string, newName: string) => {
    setRotations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, name: newName, updatedAt: Date.now() } : r
      )
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
      })
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
      })
    );
  };

  const moveSkill = (
    rotationId: string,
    fromIndex: number,
    toIndex: number
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
      })
    );
  };

  const updateSkillCount = (
    rotationId: string,
    entryId: string,
    count: number
  ) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        return {
          ...r,
          skills: r.skills.map((s) =>
            s.entryId === entryId ? { ...s, count: Math.max(1, count) } : s
          ),
          updatedAt: Date.now(),
        };
      })
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
      })
    );
  };

  const updatePassiveUptime = (
    rotationId: string,
    passiveId: string,
    uptimePercent: number
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
      })
    );
  };

  const toggleInnerWay = (rotationId: string, innerId: string) => {
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
      })
    );
  };

  return {
    rotations,
    selectedRotationId,
    selectedRotation,
    setSelectedRotationId,
    createRotation,
    deleteRotation,
    renameRotation,
    addSkillToRotation,
    removeSkillFromRotation,
    moveSkill,
    updateSkillCount,
    togglePassiveSkill,
    toggleInnerWay,
    updatePassiveUptime,
  };
};
