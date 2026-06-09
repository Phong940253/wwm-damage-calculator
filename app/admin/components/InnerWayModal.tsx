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
import { InnerWay, PassiveModifier } from "@/app/domain/skill/passiveSkillTypes";
import { LIST_MARTIAL_ARTS, MartialArtId } from "@/app/domain/skill/types";
import { STAT_LABELS } from "@/app/constants";

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

const STAT_OPTIONS = Object.entries(STAT_LABELS)
  .map(([key, label]) => ({ key, label: label || "" }))
  .sort((a, b) => a.label.localeCompare(b.label));

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

  const handleChange = <K extends keyof InnerWay>(field: K, value: InnerWay[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddModifier = () => {
    setFormData((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { type: "flat", stat: "MinPhysicalAttack", value: 0 } as PassiveModifier],
    }));
  };

  const handleModifierChange = (index: number, field: string, value: string | number | boolean | undefined) => {
    setFormData((prev) => {
      const newMods = [...prev.modifiers];
      const mod = { ...newMods[index] } as Record<string, unknown>;
      mod[field] = value;
      newMods[index] = mod as unknown as PassiveModifier;
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
          <DialogTitle>{innerWay ? "Edit Inner Way" : "Add New Inner Way"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID</label>
              <Input 
                value={formData.id} 
                onChange={(e) => handleChange("id", e.target.value)} 
                placeholder="iw_bellstrike_t1"
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
              onChange={(e) => handleChange("applicableToMartialArtId", (e.target.value as MartialArtId) || undefined)}
            >

              <option value="">-- Universal (None) --</option>
              {LIST_MARTIAL_ARTS.map((ma) => (
                <option key={ma.id} value={ma.id}>{ma.name}</option>
              ))}
            </select>
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
