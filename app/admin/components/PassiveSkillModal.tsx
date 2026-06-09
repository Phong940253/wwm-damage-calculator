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
import { PassiveSkill, PassiveModifier, StatKey } from "@/app/domain/skill/passiveSkillTypes";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";
import { STAT_LABELS } from "@/app/constants";

interface PassiveSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill?: PassiveSkill | null;
  onSave: (skill: PassiveSkill) => void;
}

const DEFAULT_PASSIVE: PassiveSkill = {
  id: "",
  name: "",
  description: "",
  modifiers: [],
};

const STAT_OPTIONS = Object.entries(STAT_LABELS)
  .map(([key, label]) => ({ key, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function PassiveSkillModal({ isOpen, onClose, skill, onSave }: PassiveSkillModalProps) {
  const [formData, setFormData] = useState<PassiveSkill>(DEFAULT_PASSIVE);

  useEffect(() => {
    if (skill) {
      const parsed = JSON.parse(JSON.stringify(skill));
      if (!parsed.modifiers) parsed.modifiers = [];
      setFormData(parsed);
    } else {
      setFormData(DEFAULT_PASSIVE);
    }
  }, [skill, isOpen]);

  const handleChange = (field: keyof PassiveSkill, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddModifier = () => {
    setFormData((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { type: "flat", stat: "MinPhysicalAttack", value: 0 } as PassiveModifier],
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Passive Skill" : "Add New Passive Skill"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID</label>
              <Input 
                value={formData.id} 
                onChange={(e) => handleChange("id", e.target.value)} 
                placeholder="ps_bellstrike_core"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.description} 
              onChange={(e) => handleChange("description", e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Default Uptime (%)</label>
              <Input 
                type="number"
                value={formData.defaultUptimePercent || 0} 
                onChange={(e) => handleChange("defaultUptimePercent", Number(e.target.value))} 
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox 
                checked={formData.includedInStats}
                onCheckedChange={(checked) => handleChange("includedInStats", !!checked)}
              />
              Included in Displayed Stats (Prevent Double Counting)
            </label>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Modifiers</h3>
              <Button size="sm" variant="outline" onClick={handleAddModifier}>Add Modifier</Button>
            </div>
            <div className="space-y-4">
              {formData.modifiers.map((mod, idx) => (
                <div key={idx} className="rounded border p-4 flex flex-col gap-3 relative bg-muted/30">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="absolute top-2 right-2 h-6 px-2 text-xs" 
                    onClick={() => handleRemoveModifier(idx)}
                  >
                    Remove
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Type</label>
                      <select
                        className="w-full rounded border border-input bg-background p-2 text-sm"
                        value={mod.type}
                        onChange={(e) => handleModifierChange(idx, "type", e.target.value)}
                      >
                        <option value="flat">Flat</option>
                        <option value="scale">Scale</option>
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Stat</label>
                      <select
                        className="w-full rounded border border-input bg-background p-2 text-sm"
                        value={mod.stat as string}
                        onChange={(e) => handleModifierChange(idx, "stat", e.target.value)}
                      >
                        {STAT_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {mod.type === "flat" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Value</label>
                        <Input type="number" step="0.1" value={mod.value || 0} onChange={(e) => handleModifierChange(idx, "value", Number(e.target.value))} />
                      </div>
                      <div className="grid gap-1 place-content-center">
                         <label className="flex items-center gap-2 text-xs cursor-pointer mt-4">
                            <Checkbox 
                                checked={mod.applyUptime !== false}
                                onCheckedChange={(checked) => handleModifierChange(idx, "applyUptime", !!checked)}
                            />
                            Apply Uptime
                         </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Source Stat</label>
                        <select
                          className="w-full rounded border border-input bg-background p-2 text-sm"
                          value={mod.sourceStat as string}
                          onChange={(e) => handleModifierChange(idx, "sourceStat", e.target.value)}
                        >
                          {STAT_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Ratio</label>
                        <Input type="number" step="0.001" value={mod.ratio || 0} onChange={(e) => handleModifierChange(idx, "ratio", Number(e.target.value))} />
                      </div>
                      <div className="grid gap-1 place-content-center">
                         <label className="flex items-center gap-2 text-xs cursor-pointer mt-4">
                            <Checkbox 
                                checked={mod.applyUptime !== false}
                                onCheckedChange={(checked) => handleModifierChange(idx, "applyUptime", !!checked)}
                            />
                            Apply Uptime
                         </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Max Bonus (Optional)</label>
                      <Input type="number" value={mod.max || ""} onChange={(e) => handleModifierChange(idx, "max", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Min Bonus (Optional)</label>
                      <Input type="number" value={mod.min || ""} onChange={(e) => handleModifierChange(idx, "min", e.target.value ? Number(e.target.value) : undefined)} />
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
