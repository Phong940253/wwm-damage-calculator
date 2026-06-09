import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skill, SkillHit, LIST_MARTIAL_ARTS, CategorySkill, WeaponType } from "@/app/domain/skill/types";

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill?: Skill | null;
  onSave: (skill: Skill) => void;
}

const DEFAULT_SKILL: Skill = {
  id: "",
  name: "",
  martialArtId: "",
  weaponType: "Sword",
  category: "martial-art-skill",
  hits: [{ physicalMultiplier: 1, elementMultiplier: 1, hits: 1 }],
  notes: "",
};

export function SkillModal({ isOpen, onClose, skill, onSave }: SkillModalProps) {
  const [formData, setFormData] = useState<Skill>(DEFAULT_SKILL);

  useEffect(() => {
    if (skill) {
      const parsed = JSON.parse(JSON.stringify(skill));
      if (!parsed.hits) parsed.hits = [];
      setFormData(parsed);
    } else {
      setFormData(DEFAULT_SKILL);
    }
  }, [skill, isOpen]);

  const handleChange = (field: keyof Skill, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddHit = () => {
    setFormData((prev) => ({
      ...prev,
      hits: [...prev.hits, { physicalMultiplier: 1, elementMultiplier: 1, hits: 1 }],
    }));
  };

  const handleHitChange = (index: number, field: keyof SkillHit, value: any) => {
    setFormData((prev) => {
      const newHits = [...prev.hits];
      newHits[index] = { ...newHits[index], [field]: Number(value) };
      return { ...prev, hits: newHits };
    });
  };

  const handleRemoveHit = (index: number) => {
    setFormData((prev) => {
      const newHits = [...prev.hits];
      newHits.splice(index, 1);
      return { ...prev, hits: newHits };
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">ID</label>
            <Input 
              value={formData.id} 
              onChange={(e) => handleChange("id", e.target.value)} 
              placeholder="e.g. nameless_sword_light" 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input 
              value={formData.name} 
              onChange={(e) => handleChange("name", e.target.value)} 
              placeholder="e.g. Nameless Sword Light Attack" 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Martial Art</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.martialArtId || ""}
              onChange={(e) => handleChange("martialArtId", e.target.value)}
            >
              <option value="">-- Universal (None) --</option>
              {LIST_MARTIAL_ARTS.map((ma) => (
                <option key={ma.id} value={ma.id}>{ma.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Category</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value as CategorySkill)}
            >
              <option value="basic">Basic Attack</option>
              <option value="martial-art-skill">Martial Art Skill</option>
              <option value="special-skill">Special Skill</option>
              <option value="dual-weapon-skill">Dual Weapon Skill</option>
              <option value="ultimate">Ultimate</option>
              <option value="mystic-skill">Mystic Skill</option>
            </select>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Damage Hits</h3>
              <Button size="sm" variant="outline" onClick={handleAddHit}>Add Hit</Button>
            </div>
            {formData.hits.map((hit, idx) => (
              <div key={idx} className="mb-4 rounded border p-3 flex flex-col gap-2 relative">
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-6 px-2 text-xs" 
                  onClick={() => handleRemoveHit(idx)}
                >
                  X
                </Button>
                <div className="font-medium text-xs text-muted-foreground">Hit #{idx + 1}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs">Phys. Mult</label>
                    <Input type="number" value={hit.physicalMultiplier} onChange={(e) => handleHitChange(idx, "physicalMultiplier", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs">Elem. Mult</label>
                    <Input type="number" value={hit.elementMultiplier} onChange={(e) => handleHitChange(idx, "elementMultiplier", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs">Hit Count</label>
                    <Input type="number" value={hit.hits} onChange={(e) => handleHitChange(idx, "hits", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Notes</label>
            <Input 
              value={formData.notes || ""} 
              onChange={(e) => handleChange("notes", e.target.value)} 
              placeholder="Internal notes..." 
            />
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
