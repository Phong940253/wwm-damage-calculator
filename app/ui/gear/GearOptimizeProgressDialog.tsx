"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/app/providers/I18nProvider";

interface Props {
  open: boolean;
  progress: { current: number; total: number };
  onCancel?: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export default function GearOptimizeProgressDialog({
  open,
  progress,
  onCancel,
}: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      title: "Đang tính tối ưu trang bị",
      checking: "Đang kiểm tra",
      gearCombinations: "tổ hợp trang bị",
      pleaseWait: "Vui lòng chờ...",
      elapsed: "Đã qua",
      eta: "Dự kiến",
      estimating: "đang tính...",
    }
    : {
      title: "Calculating Gear Optimization",
      checking: "Checking",
      gearCombinations: "gear combinations",
      pleaseWait: "Please wait...",
      elapsed: "Elapsed",
      eta: "ETA",
      estimating: "estimating...",
    };

  const startTimeRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (open) {
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  const percent =
    progress.total > 0 ? Math.min((progress.current / progress.total) * 100, 100) : 0;

  const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedStr = formatDuration(elapsedSec);

  let etaStr = text.estimating;
  if (percent > 2 && elapsedMs > 3000) {
    const estimatedSec = Math.round(elapsedSec / (percent / 100));
    const remainingSec = estimatedSec - elapsedSec;
    etaStr = formatDuration(Math.max(1, remainingSec));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel?.();
      }}
    >
      <DialogContent
        data-tour="gear-optimize-progress"
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {text.checking} {progress.current.toLocaleString()} / {progress.total.toLocaleString()} {text.gearCombinations}
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
            {text.elapsed}: {elapsedStr} &middot; {text.eta}: {etaStr}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
