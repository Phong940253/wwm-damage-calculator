"use client";

import { Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBar } from "./ui/layout/StatusBar";
import { InteractiveGuideOverlay } from "./ui/layout/InteractiveGuideOverlay";
import { MainContent } from "./ui/layout/MainContent";
import { useI18n } from "./providers/I18nProvider";

export default function DMGOptimizerClient() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6" suppressHydrationWarning>
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
          <Swords className="text-emerald-500" />
          <h1 className="text-base font-bold leading-tight sm:text-xl lg:text-2xl">
            {t("app.title")}
          </h1>
          <Badge className="text-[10px] sm:text-xs">{t("app.realtime")}</Badge>
        </div>

        {/* STATUS BAR */}
        <StatusBar />

        {/* CONTENT */}
        <MainContent />
      </div>

      <InteractiveGuideOverlay />
    </div>
  );
}
