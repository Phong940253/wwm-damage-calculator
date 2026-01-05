"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  progress: { current: number; total: number };
}

export default function GearOptimizeProgressDialog({ open, progress }: Props) {
  const percent =
    progress.total > 0 ? Math.min((progress.current / progress.total) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Calculating Gear Optimization</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Checking {progress.current.toLocaleString()} / {progress.total.toLocaleString()} gear combinations
          </p>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-sm font-semibold text-center">{Math.round(percent)}%</p>

          <p className="text-xs text-muted-foreground text-center">
            Please wait...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
