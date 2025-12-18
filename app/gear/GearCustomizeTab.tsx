"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function GearCustomizeTab() {
  const { customGears, setCustomGears } = useGear();

  const [open, setOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<CustomGear | null>(null);

  const removeGear = (id: string) => {
    setCustomGears(g => g.filter(x => x.id !== id));
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
      <Card>
        <CardHeader>
          <CardTitle>Custom Gear List</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {customGears.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No custom gear yet.
            </p>
          )}

          {customGears.map(g => (
            <div
              key={g.id}
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.slot} · {g.main.stat} +{g.main.value}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  className="text-xs text-emerald-400"
                  onClick={() => openEditDialog(g)}
                >
                  Edit
                </button>
                <button
                  className="text-xs text-red-400"
                  onClick={() => removeGear(g.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
