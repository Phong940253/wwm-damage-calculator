// app/hooks/useRotation.ts
import { useEffect, useState } from "react";
import { Rotation, RotationSkill } from "../types";
import { DEFAULT_ROTATIONS } from "@/app/domain/rotation/defaultRotations";

const STORAGE_KEY = "wwm_rotations";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
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
        setRotations(DEFAULT_ROTATIONS);
        setSelectedRotationId(DEFAULT_ROTATIONS[0].id);
        return;
      }
    }

    // Merge default rotations with saved rotations
    // Keep saved rotations that aren't already in defaults
    const defaultIds = new Set(DEFAULT_ROTATIONS.map((r) => r.id));
    const uniqueSaved = savedRotations.filter((r) => !defaultIds.has(r.id));
    const mergedRotations = [...DEFAULT_ROTATIONS, ...uniqueSaved];

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

  const createRotation = (name: string) => {
    const newRotation: Rotation = {
      id: generateId(),
      name,
      skills: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setRotations((prev) => [...prev, newRotation]);
    setSelectedRotationId(newRotation.id);
    return newRotation;
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
        r.id === id
          ? { ...r, name: newName, updatedAt: Date.now() }
          : r
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

  const moveSkill = (rotationId: string, fromIndex: number, toIndex: number) => {
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

  const updateSkillCount = (rotationId: string, entryId: string, count: number) => {
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
  };
};
