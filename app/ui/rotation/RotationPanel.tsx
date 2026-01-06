"use client";

import { useState } from "react";
import { Rotation, ElementStats } from "@/app/types";
import { SKILLS } from "@/app/domain/skill/skills";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RotationPanelProps {
  rotations: Rotation[];
  selectedRotationId: string;
  elementStats: ElementStats;
  onSelectRotation: (id: string) => void;
  onCreateRotation: (name: string) => void;
  onDeleteRotation: (id: string) => void;
  onRenameRotation: (id: string, name: string) => void;
  onAddSkill: (rotationId: string, skillId: string) => void;
  onRemoveSkill: (rotationId: string, entryId: string) => void;
  onMoveSkill: (rotationId: string, fromIndex: number, toIndex: number) => void;
  onUpdateSkillCount: (rotationId: string, entryId: string, count: number) => void;
}

export default function RotationPanel({
  rotations,
  selectedRotationId,
  elementStats,
  onSelectRotation,
  onCreateRotation,
  onDeleteRotation,
  onRenameRotation,
  onAddSkill,
  onRemoveSkill,
  onMoveSkill,
  onUpdateSkillCount,
}: RotationPanelProps) {
  const selectedRotation = rotations.find((r) => r.id === selectedRotationId);
  const [newRotationName, setNewRotationName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [searchSkill, setSearchSkill] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  const handleCreateRotation = () => {
    if (!newRotationName.trim()) return;
    onCreateRotation(newRotationName);
    setNewRotationName("");
  };

  const handleRenameStart = (rotation: Rotation) => {
    setRenamingId(rotation.id);
    setRenamingValue(rotation.name);
  };

  const handleRenameSave = () => {
    if (renamingId && renamingValue.trim()) {
      onRenameRotation(renamingId, renamingValue);
    }
    setRenamingId(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";
    
    setDragOverIndex(index);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index && selectedRotation) {
      // Calculate insertion index based on drop position
      let insertIndex = index;
      if (dropPosition === "after" && draggedIndex < index) {
        insertIndex = index;
      } else if (dropPosition === "before" && draggedIndex > index) {
        insertIndex = index;
      } else if (dropPosition === "after" && draggedIndex > index) {
        insertIndex = index + 1;
      } else if (dropPosition === "before" && draggedIndex < index) {
        insertIndex = index;
      }
      
      onMoveSkill(selectedRotation.id, draggedIndex, insertIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  // Filter skills: only show skills that match current martial art (or have no martial art)
  const currentMartialArtId = elementStats.martialArtsId;
  const availableSkills = SKILLS.filter((skill) => {
    // Filter by current martial art from StatsPanel
    if (currentMartialArtId) {
      // Only show skills from selected martial art OR skills with no martial art
      const isSameMartialArt = skill.martialArtId === currentMartialArtId;
      const hasNoMartialArt = !skill.martialArtId || skill.martialArtId === "";
      if (!isSameMartialArt && !hasNoMartialArt) return false;
    }

    // Search filter
    if (!skill.name.toLowerCase().includes(searchSkill.toLowerCase())) return false;

    return true;
  });

  // console.log(rotations, selectedRotationId);

  return (
    <div className="space-y-6">
      {/* Create New Rotation */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">New Rotation</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Rotation name..."
            value={newRotationName}
            onChange={(e) => setNewRotationName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRotation()}
            className="text-sm"
          />
          <Button
            onClick={handleCreateRotation}
            disabled={!newRotationName.trim()}
            size="sm"
            className="whitespace-nowrap"
          >
            Create
          </Button>
        </div>
      </Card>

      {/* Rotation List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Rotations</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rotations.map((rotation) => (
            <div
              key={rotation.id}
              className={cn(
                "flex items-center justify-between p-2 rounded border cursor-pointer transition-colors",
                selectedRotationId === rotation.id
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => onSelectRotation(rotation.id)}
              >
                {renamingId === rotation.id ? (
                  <input
                    autoFocus
                    value={renamingValue}
                    onChange={(e) => setRenamingValue(e.target.value)}
                    onBlur={handleRenameSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSave();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="bg-zinc-800 text-xs border border-zinc-600 px-2 py-1 rounded w-full"
                  />
                ) : (
                  <p className="text-sm font-medium truncate">{rotation.name}</p>
                )}
                <p className="text-xs text-zinc-400">
                  {rotation.skills.length} skill{rotation.skills.length !== 1 ? "s" : ""}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    ⋮
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => handleRenameStart(rotation)}
                    className="text-xs"
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm(`Delete "${rotation.name}"?`)) {
                        onDeleteRotation(rotation.id);
                      }
                    }}
                    className="text-xs text-red-400"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Rotation Skills */}
      {selectedRotation && (
        <Card className="p-4">
          <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-2">Current Martial Art</p>
            <p className="text-sm font-semibold">
              {LIST_MARTIAL_ARTS.find((m) => m.id === currentMartialArtId)?.name ||
                "None (All Skills)"}
            </p>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Skills in &quot;{selectedRotation.name}&quot;
            </h3>
            <Button
              onClick={() => setShowSkillPicker(!showSkillPicker)}
              size="sm"
              className="text-xs"
            >
              {showSkillPicker ? "Hide" : "Add Skill"}
            </Button>
          </div>

          {/* Skill Picker */}
          {showSkillPicker && (
            <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700">
              <Input
                placeholder="Search skills..."
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                className="text-xs mb-3"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      onAddSkill(selectedRotation.id, skill.id);
                      setSearchSkill("");
                    }}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                  >
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-zinc-400">{skill.martialArtId}</p>
                  </button>
                ))}
                {availableSkills.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    {searchSkill ? "No matching skills" : "All skills added"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Skills List */}
          {selectedRotation.skills.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No skills added</p>
          ) : (
            <div className="space-y-2">
              {selectedRotation.skills.map((rotSkill, idx) => {
                const skill = SKILLS.find((s) => s.id === rotSkill.id);
                if (!skill) return null;

                return (
                  <div
                    key={rotSkill.entryId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "relative flex items-center justify-between p-2 bg-zinc-800 rounded border group cursor-move transition-colors",
                      draggedIndex === idx ? "opacity-50 border-yellow-500" : "border-zinc-700",
                      dragOverIndex === idx && draggedIndex !== idx ? "border-yellow-400 bg-yellow-500/10" : ""
                    )}
                  >
                    {/* Drop position indicator */}
                    {dragOverIndex === idx && draggedIndex !== idx && (
                      <div
                        className={cn(
                          "absolute left-0 right-0 h-0.5 bg-yellow-400 z-10",
                          dropPosition === "before" ? "top-0" : "bottom-0"
                        )}
                      />
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs flex-shrink-0 cursor-grab active:cursor-grabbing">
                        ⋮⋮
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{skill.name}</p>
                        <p className="text-xs text-zinc-400">{skill.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                          x
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={rotSkill.count}
                          onChange={(e) =>
                            onUpdateSkillCount(
                              selectedRotation.id,
                              rotSkill.entryId,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-10 bg-zinc-700 text-xs border border-zinc-600 rounded px-1 py-0.5 text-zinc-100 text-center"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          idx > 0 && onMoveSkill(selectedRotation.id, idx, idx - 1)
                        }
                        disabled={idx === 0}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          idx < selectedRotation.skills.length - 1 &&
                          onMoveSkill(selectedRotation.id, idx, idx + 1)
                        }
                        disabled={idx === selectedRotation.skills.length - 1}
                        title="Move down"
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs text-red-400 hover:text-red-300"
                        onClick={() =>
                          onRemoveSkill(selectedRotation.id, rotSkill.entryId)
                        }
                        title="Remove"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
