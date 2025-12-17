"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGear } from "../hooks/useGear";
import GearForm from "./GearForm";

export default function GearCustomizeTab() {
  const { customGears, setCustomGears } = useGear();

  const removeGear = (id: string) => {
    setCustomGears(g => g.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-6">
      <GearForm />

      <Card>
        <CardHeader>
          <CardTitle>Custom Gear List</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
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

              <div className="flex gap-2">
                <button className="text-xs text-emerald-400">
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
    </div>
  );
}
    