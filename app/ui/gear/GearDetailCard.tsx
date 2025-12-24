"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAT_LABELS } from "@/app/constants";
import { CustomGear, InputStats } from "@/app/types";

interface Props {
  gear: CustomGear;
}

export default function GearDetailCard({ gear }: Props) {
  return (
    <Card className="p-3 space-y-2 border border-white/10 bg-card/70">
      {/* Gear name */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{gear.name}</p>
        <Badge variant="secondary">{gear.slot}</Badge>
      </div>

      {/* Main stat */}
      {gear.main && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main</p>
          <StatLine stat={gear.main.stat} value={gear.main.value} />
        </div>
      )}

      {/* Mains (multi-main support) */}
      {gear.mains.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main Stats</p>
          <div className="space-y-1">
            {gear.mains.map((m, i) => (
              <StatLine key={i} stat={m.stat} value={m.value} />
            ))}
          </div>
        </div>
      )}

      {/* Sub stats */}
      {gear.subs.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Sub Stats</p>
          <div className="space-y-1">
            {gear.subs.map((s, i) => (
              <StatLine key={i} stat={s.stat} value={s.value} />
            ))}
          </div>
        </div>
      )}

      {/* Addition */}
      {gear.addition && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bonus</p>
          <StatLine stat={gear.addition.stat} value={gear.addition.value} />
        </div>
      )}
    </Card>
  );
}

function StatLine({ stat, value }: { stat: keyof InputStats; value: number }) {
  const key = String(stat);

  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{STAT_LABELS[key] ?? key}</span>
      <span className="font-medium">+{value}</span>
    </div>
  );
}
