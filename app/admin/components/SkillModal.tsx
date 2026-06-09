import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Skill, 
  SkillHit, 
  LIST_MARTIAL_ARTS, 
  CategorySkill, 
  WeaponType,
  DamageSkillType 
} from "@/app/domain/skill/types";

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill?: Skill | null;
  onSave: (skill: Skill) => void;
}

const WEAPON_TYPES: WeaponType[] = [
  "Sword", "Spear", "Umbrella", "Fan", "Horizontal Blade", "Mo Blade", "Rope Dart", "Dual Blades"
];

const DAMAGE_SKILL_TYPES: DamageSkillType[] = ["normal", "charged", "ballistic", "pursuit"];

const DEFAULT_SKILL: Skill = {
  id: "",
  name: "",
  martialArtId: "",
  weaponType: "Sword",
  category: "martial-art-skill",
  hits: [{ physicalMultiplier: 1, elementMultiplier: 1, hits: 1 }],
  damageSkillType: ["normal"],
  canCrit: true,
  canAffinity: true,
  notes: "",
};

export function SkillModal({ isOpen, onClose, skill, onSave }: SkillModalProps) {
  const [formData, setFormData] = useState<Skill>(DEFAULT_SKILL);

  useEffect(() => {
    if (skill) {
      const parsed = JSON.parse(JSON.stringify(skill));
      if (!parsed.hits) parsed.hits = [];
      if (!parsed.damageSkillType) parsed.damageSkillType = ["normal"];
      if (parsed.canCrit === undefined) parsed.canCrit = true;
      if (parsed.canAffinity === undefined) parsed.canAffinity = true;
      setFormData(parsed);
    } else {
      setFormData(DEFAULT_SKILL);
    }
  }, [skill, isOpen]);

  const handleChange = (field: keyof Skill, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDamageType = (type: DamageSkillType) => {
    setFormData((prev) => {
      const current = prev.damageSkillType || [];
      if (current.includes(type)) {
        return { ...prev, damageSkillType: current.filter(t => t !== type) };
      } else {
        return { ...prev, damageSkillType: [...current, type] };
      }
    });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label className="text-sm font-medium">Weapon Type</label>
              <select
                className="rounded border border-input bg-background p-2"
                value={formData.weaponType}
                onChange={(e) => handleChange("weaponType", e.target.value as WeaponType)}
              >
                {WEAPON_TYPES.map((wt) => (
                  <option key={wt} value={wt}>{wt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Self DMG Boost (%)</label>
              <Input 
                type="number"
                value={formData.selfDamageBoostPct || 0} 
                onChange={(e) => handleChange("selfDamageBoostPct", Number(e.target.value))} 
                placeholder="e.g. 6" 
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Damage Tags</label>
            <div className="flex flex-wrap gap-4">
              {DAMAGE_SKILL_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox 
                    checked={formData.damageSkillType?.includes(type)}
                    onCheckedChange={() => handleToggleDamageType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox 
                checked={formData.canCrit}
                onCheckedChange={(checked) => handleChange("canCrit", !!checked)}
              />
              Can Critical
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox 
                checked={formData.canAffinity}
                onCheckedChange={(checked) => handleChange("canAffinity", !!checked)}
              />
              Can Affinity
            </label>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Damage Hits</h3>
              <Button size="sm" variant="outline" onClick={handleAddHit}>Add Hit</Button>
            </div>
            <div className="space-y-4">
              {formData.hits.map((hit, idx) => (
                <div key={idx} className="rounded border p-4 flex flex-col gap-3 relative bg-muted/30">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="absolute top-2 right-2 h-6 px-2 text-xs" 
                    onClick={() => handleRemoveHit(idx)}
                  >
                    Remove
                  </Button>
                  <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Hit Sequence #{idx + 1}</div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Phys. Mult</label>
                      <Input type="number" step="0.01" value={hit.physicalMultiplier} onChange={(e) => handleHitChange(idx, "physicalMultiplier", e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Elem. Mult</label>
                      <Input type="number" step="0.01" value={hit.elementMultiplier} onChange={(e) => handleHitChange(idx, "elementMultiplier", e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Hits</label>
                      <Input type="number" value={hit.hits} onChange={(e) => handleHitChange(idx, "hits", e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Flat Phys</label>
                      <Input type="number" value={hit.flatPhysical || 0} onChange={(e) => handleHitChange(idx, "flatPhysical", e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Flat Elem</label>
                      <Input type="number" value={hit.flatAttribute || 0} onChange={(e) => handleHitChange(idx, "flatAttribute", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save to List</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
