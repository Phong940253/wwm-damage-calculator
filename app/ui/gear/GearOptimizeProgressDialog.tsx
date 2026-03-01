"use client";

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
    }
    : {
      title: "Calculating Gear Optimization",
      checking: "Checking",
      gearCombinations: "gear combinations",
      pleaseWait: "Please wait...",
    };

  const percent =
    progress.total > 0 ? Math.min((progress.current / progress.total) * 100, 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Treat any user attempt to close as a cancel request.
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
            {text.pleaseWait}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
