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
  const { t } = useI18n();

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
          <DialogTitle>{t("gearOptimize.progressTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t("gearOptimize.progressChecking")} {progress.current.toLocaleString()} / {progress.total.toLocaleString()} {t("gearOptimize.progressCombinations")}
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
            {t("gearOptimize.progressPleaseWait")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
