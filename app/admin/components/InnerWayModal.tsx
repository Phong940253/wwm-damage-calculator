import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InnerWay, PassiveModifier } from "@/app/domain/skill/passiveSkillTypes";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";

interface InnerWayModalProps {
  isOpen: boolean;
  onClose: () => void;
  innerWay?: InnerWay | null;
  onSave: (innerWay: InnerWay) => void;
}

const DEFAULT_INNER_WAY: InnerWay = {
  id: "",
  name: "",
  description: "",
  modifiers: [],
};

const STAT_KEYS = [
  "max_hp", "max_focus", "physical_attack", "physical_defense", "attribute_attack", "attribute_defense",
  "critical_rate", "critical_damage", "precision_rate", "affinity_rate", "affinity_damage", "agility",
  "bellstrike", "silkbind", "stonesplit", "bamboocut", "trueweave",
];

export function InnerWayModal({ isOpen, onClose, innerWay, onSave }: InnerWayModalProps) {
  const [formData, setFormData] = useState<InnerWay>(DEFAULT_INNER_WAY);

  useEffect(() => {
    if (innerWay) {
      const parsed = JSON.parse(JSON.stringify(innerWay));
      if (!parsed.modifiers) parsed.modifiers = [];
      setFormData(parsed);
    } else {
      setFormData(DEFAULT_INNER_WAY);
    }
  }, [innerWay, isOpen]);

  const handleChange = (field: keyof InnerWay, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddModifier = () => {
    setFormData((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { type: "flat", stat: "physical_attack", value: 0 } as PassiveModifier],
    }));
  };

  const handleModifierChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newMods = [...prev.modifiers];
      newMods[index] = { ...newMods[index], [field]: value } as any;
      return { ...prev, modifiers: newMods };
    });
  };

  const handleRemoveModifier = (index: number) => {
    setFormData((prev) => {
      const newMods = [...prev.modifiers];
      newMods.splice(index, 1);
      return { ...prev, modifiers: newMods };
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
          <DialogTitle>{innerWay ? "Edit Inner Way" : "Add New Inner Way"}</DialogTitle>
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
            <label className="text-sm font-medium">Description</label>
            <Input 
              value={formData.description} 
              onChange={(e) => handleChange("description", e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Level (Tier)</label>
              <Input 
                type="number"
                value={formData.level || 1} 
                onChange={(e) => handleChange("level", Number(e.target.value))} 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tier Group ID</label>
              <Input 
                value={formData.tierGroupId || ""} 
                onChange={(e) => handleChange("tierGroupId", e.target.value)} 
                placeholder="Optional group ID"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Martial Art (Optional)</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.applicableToMartialArtId || ""}
              onChange={(e) => handleChange("applicableToMartialArtId", e.target.value || undefined)}
            >
              <option value="">-- Universal (None) --</option>
              {LIST_MARTIAL_ARTS.map((ma) => (
                <option key={ma.id} value={ma.id}>{ma.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Modifiers</h3>
              <Button size="sm" variant="outline" onClick={handleAddModifier}>Add Modifier</Button>
            </div>
            {formData.modifiers.map((mod, idx) => (
              <div key={idx} className="mb-4 rounded border p-3 flex flex-col gap-2 relative">
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-6 px-2 text-xs" 
                  onClick={() => handleRemoveModifier(idx)}
                >
                  X
                </Button>
                <div className="font-medium text-xs text-muted-foreground">Modifier #{idx + 1}</div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Type</label>
                    <select
                      className="w-full rounded border border-input bg-background p-1 text-sm"
                      value={mod.type}
                      onChange={(e) => handleModifierChange(idx, "type", e.target.value)}
                    >
                      <option value="flat">Flat</option>
                      <option value="scale">Scale</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs">Target Stat</label>
                    <select
                      className="w-full rounded border border-input bg-background p-1 text-sm"
                      value={mod.stat as string}
                      onChange={(e) => handleModifierChange(idx, "stat", e.target.value)}
                    >
                      {STAT_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                {mod.type === "flat" ? (
                  <div>
                    <label className="text-xs">Value</label>
                    <Input type="number" value={mod.value || 0} onChange={(e) => handleModifierChange(idx, "value", Number(e.target.value))} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs">Source Stat</label>
                      <select
                        className="w-full rounded border border-input bg-background p-1 text-sm"
                        value={mod.sourceStat as string || "agility"}
                        onChange={(e) => handleModifierChange(idx, "sourceStat", e.target.value)}
                      >
                        {STAT_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs">Ratio</label>
                      <Input type="number" step="0.01" value={mod.ratio || 0} onChange={(e) => handleModifierChange(idx, "ratio", Number(e.target.value))} />
                    </div>
                  </div>
                )}
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
