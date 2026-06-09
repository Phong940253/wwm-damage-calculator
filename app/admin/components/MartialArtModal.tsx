import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MartialArt, MartialArtWeaponType } from "@/app/domain/skill/types";

interface MartialArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  martialArt?: MartialArt | null;
  onSave: (ma: MartialArt) => void;
}

const DEFAULT_MA: MartialArt = {
  id: "new_martial_art" as any,
  name: "",
  element: "bellstrike",
  role: "dps",
  weapon_1: "sword",
  weapon_2: "spear",
};

export function MartialArtModal({ isOpen, onClose, martialArt, onSave }: MartialArtModalProps) {
  const [formData, setFormData] = useState<MartialArt>(DEFAULT_MA);

  useEffect(() => {
    if (martialArt) {
      setFormData(JSON.parse(JSON.stringify(martialArt)));
    } else {
      setFormData(DEFAULT_MA);
    }
  }, [martialArt, isOpen]);

  const handleChange = (field: keyof MartialArt, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{martialArt ? "Edit Martial Art" : "Add New Martial Art"}</DialogTitle>
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
            <label className="text-sm font-medium">Element</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.element}
              onChange={(e) => handleChange("element", e.target.value)}
            >
              <option value="bellstrike">Bellstrike</option>
              <option value="silkbind">Silkbind</option>
              <option value="stonesplit">Stonesplit</option>
              <option value="bamboocut">Bamboocut</option>
              <option value="trueweave">Trueweave</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              <option value="dps">DPS</option>
              <option value="support">Support</option>
              <option value="tank">Tank</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Weapon 1</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.weapon_1}
              onChange={(e) => handleChange("weapon_1", e.target.value)}
            >
              <option value="sword">Sword</option>
              <option value="spear">Spear</option>
              <option value="umbrella">Umbrella</option>
              <option value="fan">Fan</option>
              <option value="horizontal_blade">Horizontal Blade</option>
              <option value="mo_blade">Mo Blade</option>
              <option value="rope_dart">Rope Dart</option>
              <option value="dual_blades">Dual Blades</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Weapon 2</label>
            <select
              className="rounded border border-input bg-background p-2"
              value={formData.weapon_2}
              onChange={(e) => handleChange("weapon_2", e.target.value)}
            >
              <option value="sword">Sword</option>
              <option value="spear">Spear</option>
              <option value="umbrella">Umbrella</option>
              <option value="fan">Fan</option>
              <option value="horizontal_blade">Horizontal Blade</option>
              <option value="mo_blade">Mo Blade</option>
              <option value="rope_dart">Rope Dart</option>
              <option value="dual_blades">Dual Blades</option>
            </select>
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
