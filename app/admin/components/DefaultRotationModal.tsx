import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rotation, RotationSkill } from "@/app/types";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";
import { SKILLS } from "@/app/domain/skill/skills";

interface DefaultRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rotation?: Rotation | null;
  onSave: (rotation: Rotation) => void;
}

const DEFAULT_ROTATION: Rotation = {
  id: "",
  name: "",
  martialArtId: "",
  skills: [],
  activePassiveSkills: [],
  activeInnerWays: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export function DefaultRotationModal({ isOpen, onClose, rotation, onSave }: DefaultRotationModalProps) {
  const [formData, setFormData] = useState<Rotation>(DEFAULT_ROTATION);

  useEffect(() => {
    if (rotation) {
      const parsed = JSON.parse(JSON.stringify(rotation));
      if (!parsed.skills) parsed.skills = [];
      if (!parsed.activePassiveSkills) parsed.activePassiveSkills = [];
      if (!parsed.activeInnerWays) parsed.activeInnerWays = [];
      setFormData(parsed);
    } else {
      setFormData({ ...DEFAULT_ROTATION, createdAt: Date.now(), updatedAt: Date.now() });
    }
  }, [rotation, isOpen]);

  const handleChange = (field: keyof Rotation, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    const newEntryId = Math.random().toString(36).substring(2, 11);
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { entryId: newEntryId, id: "", order: prev.skills.length, count: 1 } as RotationSkill],
    }));
  };

  const handleSkillChange = (index: number, field: keyof RotationSkill, value: any) => {
    setFormData((prev) => {
      const newSkills = [...prev.skills];
      newSkills[index] = { ...newSkills[index], [field]: value };
      return { ...prev, skills: newSkills };
    });
  };

  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => {
      const newSkills = [...prev.skills];
      newSkills.splice(index, 1);
      // Re-order
      newSkills.forEach((s, i) => s.order = i);
      return { ...prev, skills: newSkills };
    });
  };

  const handleSave = () => {
    onSave({ ...formData, updatedAt: Date.now() });
    onClose();
  };

  // Filter skills by martial art
  const availableSkills = SKILLS.filter(s => !formData.martialArtId || !s.martialArtId || s.martialArtId === formData.martialArtId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{rotation ? "Edit Default Rotation" : "Add Default Rotation"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">ID</label>
            <Input 
              value={formData.id} 
              onChange={(e) => handleChange("id", e.target.value)} 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input 
              value={formData.name} 
              onChange={(e) => handleChange("name", e.target.value)} 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Martial Art (Optional)</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.martialArtId || ""}
              onChange={(e) => handleChange("martialArtId", e.target.value || undefined)}
            >
              <option value="">-- Universal (None) --</option>
              {LIST_MARTIAL_ARTS.map((ma) => (
                <option key={ma.id} value={ma.id}>{ma.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Skills in Rotation</h3>
              <Button size="sm" variant="outline" onClick={handleAddSkill}>Add Skill</Button>
            </div>
            {formData.skills.map((rs, idx) => (
              <div key={rs.entryId || idx} className="mb-4 rounded border p-3 flex flex-col gap-2 relative">
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-6 px-2 text-xs" 
                  onClick={() => handleRemoveSkill(idx)}
                >
                  X
                </Button>
                <div className="font-medium text-xs text-muted-foreground">Order: {rs.order}</div>
                
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <label className="text-xs">Skill ID</label>
                    <select
                      className="w-full rounded border border-input bg-background p-1 text-sm"
                      value={rs.id}
                      onChange={(e) => handleSkillChange(idx, "id", e.target.value)}
                    >
                      <option value="">-- Select Skill --</option>
                      {availableSkills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs">Count</label>
                    <Input 
                      type="number" 
                      value={rs.count} 
                      onChange={(e) => handleSkillChange(idx, "count", Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save to List</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
