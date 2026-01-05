// app/hooks/useRotation.ts
import { useEffect, useState } from "react";
import { Rotation, RotationSkill } from "../types";

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
    if (!raw) {
      // Khởi tạo rotation trống
      const initialRotation: Rotation = {
        id: generateId(),
        name: "Default",
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setRotations([initialRotation]);
      setSelectedRotationId(initialRotation.id);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Rotation[];
      setRotations(parsed);
      if (parsed.length > 0) {
        setSelectedRotationId(parsed[0].id);
      }
    } catch {
      // Fallback
      const initialRotation: Rotation = {
        id: generateId(),
        name: "Default",
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setRotations([initialRotation]);
      setSelectedRotationId(initialRotation.id);
    }
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

        // Check if skill already exists
        if (r.skills.some((s) => s.id === skillId)) return r;

        const newSkill: RotationSkill = {
          id: skillId,
          order: r.skills.length,
        };
        return {
          ...r,
          skills: [...r.skills, newSkill],
          updatedAt: Date.now(),
        };
      })
    );
  };

  const removeSkillFromRotation = (rotationId: string, skillId: string) => {
    setRotations((prev) =>
      prev.map((r) => {
        if (r.id !== rotationId) return r;

        const filtered = r.skills.filter((s) => s.id !== skillId);
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
  };
};
