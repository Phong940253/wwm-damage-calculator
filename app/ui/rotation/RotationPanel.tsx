"use client";

import { useState } from "react";
import { Rotation, ElementStats } from "@/app/types";
import { SKILLS } from "@/app/domain/skill/skills";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";
import { PASSIVE_SKILLS } from "@/app/domain/skill/passiveSkills";
import { INNER_WAYS } from "@/app/domain/skill/innerWays";
import { DEFAULT_ROTATIONS } from "@/app/domain/rotation/defaultRotations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/app/providers/I18nProvider";

interface RotationPanelProps {
  rotations: Rotation[];
  selectedRotationId: string;
  elementStats: ElementStats;
  onSelectRotation: (id: string) => void;
  onCreateRotation: (name: string, martialArtId?: ElementStats["martialArtsId"]) => void;
  onDuplicateRotation: (id: string) => void;
  onDeleteRotation: (id: string) => void;
  onRenameRotation: (id: string, name: string) => void;
  onAddSkill: (rotationId: string, skillId: string) => void;
  onRemoveSkill: (rotationId: string, entryId: string) => void;
  onMoveSkill: (rotationId: string, fromIndex: number, toIndex: number) => void;
  onUpdateSkillCount: (rotationId: string, entryId: string, count: number) => void;
  onUpdateSkillParams: (rotationId: string, entryId: string, patch: Record<string, number>) => void;
  onTogglePassiveSkill: (rotationId: string, passiveId: string) => void;
  onUpdatePassiveUptime: (
    rotationId: string,
    passiveId: string,
    uptimePercent: number
  ) => void;
  onToggleInnerWay: (rotationId: string, innerId: string) => void;
  onSetInnerWayTier: (
    rotationId: string,
    tierGroupId: string,
    innerWayId: string | null,
  ) => void;
}

const DEFAULT_ROTATION_IDS = new Set(DEFAULT_ROTATIONS.map((r) => r.id));
const isDefaultRotation = (rotation?: Rotation | null) =>
  !!rotation && DEFAULT_ROTATION_IDS.has(rotation.id);

export default function RotationPanel({
  rotations,
  selectedRotationId,
  elementStats,
  onSelectRotation,
  onCreateRotation,
  onDuplicateRotation,
  onDeleteRotation,
  onRenameRotation,
  onAddSkill,
  onRemoveSkill,
  onMoveSkill,
  onUpdateSkillCount,
  onUpdateSkillParams,
  onTogglePassiveSkill,
  onUpdatePassiveUptime,
  onToggleInnerWay,
  onSetInnerWayTier,
}: RotationPanelProps) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      newRotation: "Rotation mới",
      rotationNamePlaceholder: "Tên rotation...",
      create: "Tạo",
      rotations: "Rotations",
      default: "Mặc định",
      skillCount: (count: number) => `${count} kỹ năng`,
      rename: "Đổi tên",
      duplicate: "Nhân bản",
      copyJson: "Sao chép JSON",
      exportJson: "Xuất JSON",
      delete: "Xóa",
      deleteConfirm: (name: string) => `Xóa \"${name}\"?`,
      copyFailed: "Không thể sao chép JSON rotation vào clipboard.",
      readonly: "Rotation này chỉ đọc. Hãy tạo rotation mới để tùy chỉnh.",
      currentMartialArt: "Võ học hiện tại",
      noneAllSkills: "Không có (Tất cả kỹ năng)",
      passiveSkills: "Kỹ năng nội tại",
      innerWays: "Nội công",
      hide: "Ẩn",
      show: "Hiện",
      noPassive: "Không có kỹ năng nội tại cho võ học này",
      noInnerWays: "Không có nội công khả dụng",
      uptime: "Thời gian hoạt động",
      tier: "Tầng",
      off: "Tắt",
      lockedDefault: "Rotation mặc định bị khóa",
      selectTier: "Chọn tầng",
      skillsIn: (name: string) => `Kỹ năng trong \"${name}\"`,
      addSkill: "Thêm kỹ năng",
      searchSkills: "Tìm kỹ năng...",
      noMatchingSkills: "Không có kỹ năng phù hợp",
      allSkillsAdded: "Đã thêm tất cả kỹ năng",
      noSkillsAdded: "Chưa thêm kỹ năng",
      blossoms: "Hoa",
      duration: "Thời lượng (s)",
      charge: "Tích lực (%)",
      moveUp: "Di chuyển lên",
      moveDown: "Di chuyển xuống",
      remove: "Xóa",
    }
    : {
      newRotation: "New Rotation",
      rotationNamePlaceholder: "Rotation name...",
      create: "Create",
      rotations: "Rotations",
      default: "Default",
      skillCount: (count: number) => `${count} skill${count !== 1 ? "s" : ""}`,
      rename: "Rename",
      duplicate: "Duplicate",
      copyJson: "Copy JSON",
      exportJson: "Export to JSON",
      delete: "Delete",
      deleteConfirm: (name: string) => `Delete \"${name}\"?`,
      copyFailed: "Failed to copy rotation JSON to clipboard.",
      readonly: "This rotation is read-only. Create a new rotation to customize.",
      currentMartialArt: "Current Martial Art",
      noneAllSkills: "None (All Skills)",
      passiveSkills: "Passive Skills",
      innerWays: "Inner Ways",
      hide: "Hide",
      show: "Show",
      noPassive: "No passive skills for this martial art",
      noInnerWays: "No inner ways available",
      uptime: "Uptime",
      tier: "Tier",
      off: "Off",
      lockedDefault: "Default rotations are locked",
      selectTier: "Select tier",
      skillsIn: (name: string) => `Skills in \"${name}\"`,
      addSkill: "Add Skill",
      searchSkills: "Search skills...",
      noMatchingSkills: "No matching skills",
      allSkillsAdded: "All skills added",
      noSkillsAdded: "No skills added",
      blossoms: "Blossoms",
      duration: "Duration (s)",
      charge: "Charge (%)",
      moveUp: "Move up",
      moveDown: "Move down",
      remove: "Remove",
    };

  const selectedRotation = rotations.find((r) => r.id === selectedRotationId);
  const selectedIsDefault = isDefaultRotation(selectedRotation);
  const [newRotationName, setNewRotationName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [showPassiveSkills, setShowPassiveSkills] = useState(false);
  const [showInnerWays, setShowInnerWays] = useState(false);
  const [searchSkill, setSearchSkill] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  const handleCreateRotation = () => {
    if (!newRotationName.trim()) return;
    onCreateRotation(newRotationName, elementStats.martialArtsId);
    setNewRotationName("");
  };

  const handleRenameStart = (rotation: Rotation) => {
    if (isDefaultRotation(rotation)) return;
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
    if (selectedIsDefault) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    if (selectedIsDefault) return;
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
    if (selectedIsDefault) return;
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

  const handleExportRotation = (rotation: Rotation) => {
    const dataStr = JSON.stringify(rotation, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rotation.name.replace(/\s+/g, "_")}_rotation.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for older browsers / restricted contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!ok) throw new Error("Copy failed");
  };

  const handleCopyRotationToClipboard = async (rotation: Rotation) => {
    try {
      const dataStr = JSON.stringify(rotation, null, 2);
      await copyTextToClipboard(dataStr);
    } catch {
      alert(text.copyFailed);
    }
  };

  const currentMartialArtId = elementStats.martialArtsId;

  const availablePassiveSkills = PASSIVE_SKILLS.filter(
    (ps) => !ps.martialArtId || ps.martialArtId === currentMartialArtId
  );

  const availableInnerWays = INNER_WAYS.filter((iw) => {
    const martialArtId = currentMartialArtId as
      | import("@/app/domain/skill/types").MartialArtId
      | undefined;

    // Martial-art specific inner way
    if (iw.applicableToMartialArtId) {
      return iw.applicableToMartialArtId === martialArtId;
    }

    // Universal inner ways should always be visible in the list.
    return true;
  });

  const innerWayGroups = (() => {
    const map = new Map<string, typeof availableInnerWays>();
    for (const iw of availableInnerWays) {
      const key = iw.tierGroupId ?? iw.id;
      const arr = map.get(key) ?? [];
      arr.push(iw);
      map.set(key, arr);
    }

    const groups = Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => (a.level ?? 0) - (b.level ?? 0),
      );
      const hasTiers = !!sorted[0]?.tierGroupId && sorted.length > 1;
      const selected = sorted
        .filter((x) => selectedRotation?.activeInnerWays.includes(x.id))
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
        .at(-1);

      const baseName = hasTiers
        ? (sorted[0]?.name ?? key).replace(/\s*\(Tier\s*\d+\)\s*$/i, "")
        : sorted[0]?.name ?? key;

      return {
        key,
        items: sorted,
        hasTiers,
        selected,
        baseName,
      };
    });

    groups.sort((a, b) => a.baseName.localeCompare(b.baseName));
    return groups;
  })();

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
    <div className="space-y-4 sm:space-y-6">
      {/* Create New Rotation */}
      <Card className="p-3 sm:p-4">
        <h3 className="text-sm font-semibold mb-3">{text.newRotation}</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={text.rotationNamePlaceholder}
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
            {text.create}
          </Button>
        </div>
      </Card>

      {/* Rotation List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{text.rotations}</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rotations.map((rotation) => (
            (() => {
              const rotationIsDefault = isDefaultRotation(rotation);
              return (
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
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate">{rotation.name}</p>
                        {rotationIsDefault && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 flex-shrink-0"
                          >
                            {text.default}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-zinc-400">
                      {text.skillCount(rotation.skills.length)}
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
                        disabled={rotationIsDefault}
                        onClick={() => handleRenameStart(rotation)}
                        className="text-xs"
                      >
                        {text.rename}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicateRotation(rotation.id)}
                        className="text-xs"
                      >
                        {text.duplicate}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleCopyRotationToClipboard(rotation)}
                        className="text-xs"
                      >
                        {text.copyJson}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportRotation(rotation)}
                        className="text-xs"
                      >
                        {text.exportJson}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (rotationIsDefault) return;
                          if (confirm(text.deleteConfirm(rotation.name))) {
                            onDeleteRotation(rotation.id);
                          }
                        }}
                        disabled={rotationIsDefault}
                        className="text-xs text-red-400"
                      >
                        {text.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })()
          ))}
        </div>
      </div>

      {/* Selected Rotation Skills */}
      {selectedRotation && (
        <Card className="p-4">
          {selectedIsDefault && (
            <div className="mb-4 rounded border border-zinc-700 bg-zinc-800/50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs h-5">
                  Default
                </Badge>
                <p className="text-xs text-zinc-300">
                  {text.readonly}
                </p>
              </div>
            </div>
          )}
          <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-2">{text.currentMartialArt}</p>
            <p className="text-sm font-semibold">
              {LIST_MARTIAL_ARTS.find((m) => m.id === currentMartialArtId)?.name ||
                text.noneAllSkills}
            </p>
          </div>

          {/* ========== PASSIVE SKILLS ========== */}
          <div className="mb-4 pb-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Passive Skills</h3>
              <h3 className="text-sm font-semibold">{text.passiveSkills}</h3>
              <Button
                onClick={() => setShowPassiveSkills(!showPassiveSkills)}
                size="sm"
                className="text-xs"
              >
                {showPassiveSkills ? text.hide : text.show}
              </Button>
            </div>

            {showPassiveSkills && (
              <div className="space-y-2 bg-zinc-800/50 p-3 rounded border border-zinc-700">
                {availablePassiveSkills.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    {text.noPassive}
                  </p>
                ) : (
                  availablePassiveSkills.map((passive) => (
                    <div
                      key={passive.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-zinc-700/30 transition"
                    >
                      <Checkbox
                        checked={selectedRotation.activePassiveSkills.includes(
                          passive.id
                        )}
                        disabled={selectedIsDefault}
                        onCheckedChange={() => {
                          if (selectedIsDefault) return;
                          onTogglePassiveSkill(selectedRotation.id, passive.id);
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-100">
                          {passive.name}
                        </p>
                        <p className="text-xs text-zinc-400 leading-tight">
                          {passive.description}
                        </p>

                        {typeof passive.defaultUptimePercent === "number" && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-zinc-400">Uptime</p>
                              <p className="text-[11px] text-zinc-400">{text.uptime}</p>
                              <p className="text-[11px] text-zinc-200">
                                {(
                                  selectedRotation.passiveUptimes?.[passive.id] ??
                                  passive.defaultUptimePercent ??
                                  100
                                ).toFixed(0)}
                                %
                              </p>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={
                                selectedRotation.passiveUptimes?.[passive.id] ??
                                passive.defaultUptimePercent ??
                                100
                              }
                              disabled={
                                selectedIsDefault ||
                                !selectedRotation.activePassiveSkills.includes(
                                  passive.id
                                )
                              }
                              onChange={(e) =>
                                !selectedIsDefault &&
                                onUpdatePassiveUptime(
                                  selectedRotation.id,
                                  passive.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-yellow-500 disabled:opacity-40"
                            />
                          </div>
                        )}

                        {passive.notes && (
                          <p className="text-xs text-zinc-500 italic mt-1">
                            {passive.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ========== INNER WAYS ========== */}
          <div className="mb-4 pb-4 border-b border-zinc-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{text.innerWays}</h3>
              <Button
                onClick={() => setShowInnerWays(!showInnerWays)}
                size="sm"
                className="text-xs"
              >
                {showInnerWays ? text.hide : text.show}
              </Button>
            </div>

            {showInnerWays && (
              <div className="space-y-2 bg-zinc-800/50 p-3 rounded border border-zinc-700">
                {availableInnerWays.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    {text.noInnerWays}
                  </p>
                ) : (
                  innerWayGroups.map((group) => {
                    if (!selectedRotation) return null;

                    // Non-tiered inner way: keep checkbox UX
                    if (!group.hasTiers) {
                      const inner = group.items[0];
                      if (!inner) return null;

                      return (
                        <div
                          key={inner.id}
                          className="flex items-start gap-2 p-2 rounded hover:bg-zinc-700/30 transition"
                        >
                          <Checkbox
                            checked={selectedRotation.activeInnerWays.includes(inner.id)}
                            disabled={selectedIsDefault}
                            onCheckedChange={() => {
                              if (selectedIsDefault) return;
                              onToggleInnerWay(selectedRotation.id, inner.id);
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-zinc-100">
                                {inner.name}
                              </p>
                              {typeof inner.level === "number" && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  Tier {inner.level}
                                  {text.tier} {inner.level}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 leading-tight">
                              {inner.description}
                            </p>
                            {inner.notes && (
                              <p className="text-xs text-zinc-500 italic mt-1">
                                {inner.notes}
                              </p>
                            )}
                            {inner.applicableToMartialArtId && (
                              <p className="text-xs text-blue-400 mt-1">
                                ↳ {LIST_MARTIAL_ARTS.find(
                                  (m) => m.id === inner.applicableToMartialArtId,
                                )?.name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Tiered inner way: single selector (Off / Tier)
                    const selectedTier = group.selected;
                    const displayTier = selectedTier
                      ? `${text.tier} ${selectedTier.level ?? "?"}`
                      : text.off;
                    const details = selectedTier ?? group.items[group.items.length - 1];

                    return (
                      <div
                        key={group.key}
                        className="flex items-start gap-2 p-2 rounded hover:bg-zinc-700/30 transition"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-0.5 h-7 px-2 text-xs"
                              disabled={selectedIsDefault}
                              title={selectedIsDefault ? text.lockedDefault : text.selectTier}
                            >
                              {displayTier}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                if (selectedIsDefault) return;
                                onSetInnerWayTier(selectedRotation.id, group.key, null);
                              }}
                            >
                              {text.off}
                            </DropdownMenuItem>
                            {group.items.map((tier) => (
                              <DropdownMenuItem
                                key={tier.id}
                                onClick={() => {
                                  if (selectedIsDefault) return;
                                  onSetInnerWayTier(selectedRotation.id, group.key, tier.id);
                                }}
                              >
                                {text.tier} {tier.level ?? "?"}: {tier.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-zinc-100">
                              {group.baseName}
                            </p>
                            {selectedTier && typeof selectedTier.level === "number" && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {text.tier} {selectedTier.level}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-tight">
                            {details?.description ?? ""}
                          </p>
                          {details?.notes && (
                            <p className="text-xs text-zinc-500 italic mt-1">
                              {details.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {text.skillsIn(selectedRotation.name)}
            </h3>
            <Button
              onClick={() => !selectedIsDefault && setShowSkillPicker(!showSkillPicker)}
              size="sm"
              className="text-xs"
              disabled={selectedIsDefault}
            >
              {showSkillPicker ? text.hide : text.addSkill}
            </Button>
          </div>

          {/* Skill Picker */}
          {showSkillPicker && (
            <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700">
              <Input
                placeholder={text.searchSkills}
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                className="text-xs mb-3"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      if (selectedIsDefault) return;
                      onAddSkill(selectedRotation.id, skill.id);
                      setSearchSkill("");
                    }}
                    disabled={selectedIsDefault}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-zinc-700 transition-colors"
                  >
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-zinc-400">{skill.martialArtId}</p>
                  </button>
                ))}
                {availableSkills.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    {searchSkill ? text.noMatchingSkills : text.allSkillsAdded}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Skills List */}
          {selectedRotation.skills.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">{text.noSkillsAdded}</p>
          ) : (
            <div className="space-y-2">
              {selectedRotation.skills.map((rotSkill, idx) => {
                const skill = SKILLS.find((s) => s.id === rotSkill.id);
                if (!skill) return null;

                return (
                  <div
                    key={rotSkill.entryId}
                    draggable={!selectedIsDefault}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "relative flex items-center justify-between p-2 bg-zinc-800 rounded border group cursor-move transition-colors",
                      selectedIsDefault ? "cursor-not-allowed" : "cursor-move",
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
                          disabled={selectedIsDefault}
                          onChange={(e) =>
                            !selectedIsDefault &&
                            onUpdateSkillCount(
                              selectedRotation.id,
                              rotSkill.entryId,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-10 bg-zinc-700 text-xs border border-zinc-600 rounded px-1 py-0.5 text-zinc-100 text-center"
                        />
                      </div>

                      {skill.id === "vernal_unfaded_flower" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-400 whitespace-nowrap">{text.blossoms}</span>
                          <input
                            type="number"
                            min="0"
                            value={rotSkill.params?.blossoms ?? 100}
                            disabled={selectedIsDefault}
                            onChange={(e) => {
                              if (selectedIsDefault) return;
                              const next = Number(e.target.value);
                              onUpdateSkillParams(selectedRotation.id, rotSkill.entryId, {
                                blossoms: Number.isFinite(next) ? next : 0,
                              });
                            }}
                            className="w-16 bg-zinc-700 text-xs border border-zinc-600 rounded px-1 py-0.5 text-zinc-100 text-center"
                            title="Unfaded Flower scaling: duration ~= Blossoms / 10s"
                          />
                        </div>
                      )}

                      {skill.id === "vernal_umbrella_light_spring_away" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-400 whitespace-nowrap">{text.duration}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={rotSkill.params?.duration ?? 1}
                            disabled={selectedIsDefault}
                            onChange={(e) => {
                              if (selectedIsDefault) return;
                              const next = Number(e.target.value);
                              onUpdateSkillParams(selectedRotation.id, rotSkill.entryId, {
                                duration: Number.isFinite(next) ? next : 1,
                              });
                            }}
                            className="w-14 bg-zinc-700 text-xs border border-zinc-600 rounded px-1 py-0.5 text-zinc-100 text-center"
                            title="Spring Away is DPS-based: total = DPS × duration"
                          />
                        </div>
                      )}

                      {skill.id === "vernal_apricot_heaven" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-400 whitespace-nowrap">{text.charge}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={rotSkill.params?.chargePct ?? 100}
                            disabled={selectedIsDefault}
                            onChange={(e) => {
                              if (selectedIsDefault) return;
                              const next = Number(e.target.value);
                              onUpdateSkillParams(selectedRotation.id, rotSkill.entryId, {
                                chargePct: Number.isFinite(next) ? next : 100,
                              });
                            }}
                            className="w-14 bg-zinc-700 text-xs border border-zinc-600 rounded px-1 py-0.5 text-zinc-100 text-center"
                            title="Apricot Heaven: 2nd-stage damage scales linearly Min→Max by charge %"
                          />
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          !selectedIsDefault &&
                          idx > 0 &&
                          onMoveSkill(selectedRotation.id, idx, idx - 1)
                        }
                        disabled={selectedIsDefault || idx === 0}
                        title={text.moveUp}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          !selectedIsDefault &&
                          idx < selectedRotation.skills.length - 1 &&
                          onMoveSkill(selectedRotation.id, idx, idx + 1)
                        }
                        disabled={
                          selectedIsDefault || idx === selectedRotation.skills.length - 1
                        }
                        title={text.moveDown}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-xs text-red-400 hover:text-red-300"
                        onClick={() =>
                          !selectedIsDefault &&
                          onRemoveSkill(selectedRotation.id, rotSkill.entryId)
                        }
                        disabled={selectedIsDefault}
                        title={text.remove}
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
