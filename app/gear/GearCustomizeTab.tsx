"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useGear } from "../gear/GearContext";
import GearForm from "./GearForm";
import { CustomGear } from "@/app/types";
import GearCard from "./GearCard";

export default function GearCustomizeTab() {
  const { customGears, setCustomGears } = useGear();

  const [open, setOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<CustomGear | null>(null);

  const removeGear = (id: string) => {
    setCustomGears((g) => g.filter((x) => x.id !== id));
  };

  const openAddDialog = () => {
    setEditingGear(null);
    setOpen(true);
  };

  const openEditDialog = (gear: CustomGear) => {
    setEditingGear(gear);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Custom Gear</h3>
        <Button onClick={openAddDialog}>+ Add Gear</Button>
      </div>

      {/* Gear List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customGears.map((g) => (
          <GearCard
            key={g.id}
            gear={g}
            onEdit={() => openEditDialog(g)}
            onDelete={() => removeGear(g.id)}
          />
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingGear ? "Edit Gear" : "Add New Gear"}
            </DialogTitle>
          </DialogHeader>

          <GearForm
            initialGear={editingGear}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
