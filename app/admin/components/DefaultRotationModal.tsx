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
import { Badge } from "@/components/ui/badge";
import ParamPopover from "@/app/ui/rotation/ParamPopover";
import { Rotation, RotationSkill } from "@/app/types";
import { LIST_MARTIAL_ARTS } from "@/app/domain/skill/types";
import { SKILLS } from "@/app/domain/skill/skills";
import { PASSIVE_SKILLS } from "@/app/domain/skill/passiveSkills";
import { INNER_WAYS } from "@/app/domain/skill/innerWays";

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
  passiveUptimes: {},
  activeInnerWays: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export function DefaultRotationModal({ isOpen, onClose, rotation, onSave }: DefaultRotationModalProps) {
  const [formData, setFormData] = useState<Rotation>(DEFAULT_ROTATION);
  const [activeTab, setActiveTab] = useState<"skills" | "passives" | "innerWays">("skills");

  useEffect(() => {
    if (rotation) {
      const parsed = JSON.parse(JSON.stringify(rotation));
      if (!parsed.skills) parsed.skills = [];
      if (!parsed.activePassiveSkills) parsed.activePassiveSkills = [];
      if (!parsed.activeInnerWays) parsed.activeInnerWays = [];
      if (!parsed.passiveUptimes) parsed.passiveUptimes = {};
      setFormData(parsed);
    } else {
      setFormData({ ...DEFAULT_ROTATION, createdAt: Date.now(), updatedAt: Date.now() });
    }
  }, [rotation, isOpen]);

  const handleChange = <K extends keyof Rotation>(field: K, value: Rotation[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    const newEntryId = Math.random().toString(36).substring(2, 11);
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { 
        entryId: newEntryId, 
        id: "", 
        order: prev.skills.length, 
        count: 1,
        cancelled: false,
        params: {}
      } as RotationSkill],
    }));
  };

  const handleSkillChange = <K extends keyof RotationSkill>(index: number, field: K, value: RotationSkill[K]) => {
    setFormData((prev) => {
      const newSkills = [...prev.skills];
      newSkills[index] = { ...newSkills[index], [field]: value };
      return { ...prev, skills: newSkills };
    });
  };

  const handleUpdateSkillParam = (skillIndex: number, key: string, value: number) => {
    setFormData((prev) => {
      const newSkills = [...prev.skills];
      const nextParams = { ...(newSkills[skillIndex].params || {}), [key]: value };
      newSkills[skillIndex] = { ...newSkills[skillIndex], params: nextParams };
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

  const handleTogglePassive = (id: string) => {
    setFormData(prev => {
      const active = prev.activePassiveSkills || [];
      const nextActive = active.includes(id) 
        ? active.filter(x => x !== id) 
        : [...active, id];
      
      const nextUptimes = { ...(prev.passiveUptimes || {}) };
      if (!active.includes(id) && nextUptimes[id] === undefined) {
        const p = PASSIVE_SKILLS.find(x => x.id === id);
        nextUptimes[id] = p?.defaultUptimePercent ?? 100;
      }

      return { ...prev, activePassiveSkills: nextActive, passiveUptimes: nextUptimes };
    });
  };

  const handlePassiveUptimeChange = (id: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      passiveUptimes: { ...(prev.passiveUptimes || {}), [id]: value }
    }));
  };

  const handleToggleInnerWay = (id: string) => {
    setFormData(prev => {
      const active = prev.activeInnerWays || [];
      const nextActive = active.includes(id) 
        ? active.filter(x => x !== id) 
        : [...active, id];
      return { ...prev, activeInnerWays: nextActive };
    });
  };

  const handleSave = () => {
    onSave({ ...formData, updatedAt: Date.now() });
    onClose();
  };

  // Filter lists by martial art
  const currentMA = formData.martialArtId;
  const availableSkills = SKILLS.filter(s => !currentMA || !s.martialArtId || s.martialArtId === currentMA);
  const availablePassives = PASSIVE_SKILLS.filter(p => !currentMA || !p.martialArtId || p.martialArtId === currentMA);
  const availableInnerWays = INNER_WAYS.filter(iw => !currentMA || !iw.applicableToMartialArtId || iw.applicableToMartialArtId === currentMA);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-[800px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{rotation ? "Edit Default Rotation" : "Add Default Rotation"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">ID</label>
              <Input 
                value={formData.id} 
                onChange={(e) => handleChange("id", e.target.value)} 
                placeholder="e.g. rotation_bellstrike_starter"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
                placeholder="e.g. Bellstrike Starter Rotation"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Martial Art (Scope)</label>
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

          <div className="flex border-b border-border">
            <button 
              onClick={() => setActiveTab("skills")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "skills" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              Skills ({formData.skills.length})
            </button>
            <button 
              onClick={() => setActiveTab("passives")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "passives" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              Passives ({formData.activePassiveSkills.length})
            </button>
            <button 
              onClick={() => setActiveTab("innerWays")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "innerWays" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              Inner Ways ({formData.activeInnerWays.length})
            </button>
          </div>

          {activeTab === "skills" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Skills Sequence</h3>
                <Button size="sm" variant="outline" onClick={handleAddSkill}>Add Skill Entry</Button>
              </div>
              <div className="space-y-3">
                {formData.skills.map((rs, idx) => (
                  <div key={rs.entryId || idx} className="rounded border p-4 flex flex-col gap-3 relative bg-muted/20">
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="absolute top-2 right-2 h-6 px-2 text-xs" 
                      onClick={() => handleRemoveSkill(idx)}
                    >
                      Remove
                    </Button>
                    
                    <div className="flex items-center gap-4">
                       <Badge variant="secondary">Step {idx + 1}</Badge>
                       <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox 
                            checked={rs.cancelled}
                            onCheckedChange={(checked) => handleSkillChange(idx, "cancelled", !!checked)}
                          />
                          Cancelled (Effect Only)
                       </label>
                    </div>

                    <div className="grid grid-cols-[1fr_100px] gap-3">
                      <div className="grid gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Skill ID</label>
                        <select
                          className="w-full rounded border border-input bg-background p-2 text-sm"
                          value={rs.id}
                          onChange={(e) => handleSkillChange(idx, "id", e.target.value)}
                        >
                          <option value="">-- Select Skill --</option>
                          {availableSkills.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Count</label>
                        <Input 
                          type="number" 
                          value={rs.count} 
                          onChange={(e) => handleSkillChange(idx, "count", Number(e.target.value))} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Params</span>
                      {(() => {
                        const skill = availableSkills.find(s => s.id === rs.id);
                        if (!skill) return null;
                        return (
                          <ParamPopover
                            skill={skill}
                            params={rs.params}
                            rotationSkills={formData.skills}
                            onParamChange={(key, value) => handleUpdateSkillParam(idx, key, value)}
                          />
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {formData.skills.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No skills added yet.</p>}
              </div>
            </div>
          )}

          {activeTab === "passives" && (
            <div className="space-y-2">
              <h3 className="font-semibold mb-2">Enabled Passive Skills</h3>
              <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
                {availablePassives.map(p => (
                  <div key={p.id} className="flex flex-col gap-2 p-3 rounded border bg-muted/10">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 text-sm cursor-pointer">
                        <Checkbox 
                          checked={formData.activePassiveSkills.includes(p.id)}
                          onCheckedChange={() => handleTogglePassive(p.id)}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.id}</span>
                        </div>
                      </label>
                    </div>
                    {formData.activePassiveSkills.includes(p.id) && (
                      <div className="flex items-center gap-4 pl-8 pt-1 border-t border-border/50">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Uptime (%)</label>
                        <Input 
                          type="number" 
                          className="h-7 w-20 text-xs" 
                          value={formData.passiveUptimes?.[p.id] ?? 100}
                          onChange={(e) => handlePassiveUptimeChange(p.id, Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "innerWays" && (
            <div className="space-y-2">
              <h3 className="font-semibold mb-2">Enabled Inner Ways</h3>
              <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
                {availableInnerWays.map(iw => (
                  <label key={iw.id} className="flex items-center gap-3 p-3 rounded border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                    <Checkbox 
                      checked={formData.activeInnerWays.includes(iw.id)}
                      onCheckedChange={() => handleToggleInnerWay(iw.id)}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{iw.name}</span>
                        {iw.level && <Badge variant="outline" className="text-[9px] h-4">T{iw.level}</Badge>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{iw.id}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Rotation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
