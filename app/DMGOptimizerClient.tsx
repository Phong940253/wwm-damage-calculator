"use client";

import { Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBar } from "./ui/layout/StatusBar";
import { MainContent } from "./ui/layout/MainContent";

export default function DMGOptimizerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootTab = searchParams.get("root") ?? "main";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Swords className="text-emerald-500" />
          <h1 className="text-2xl font-bold">
            Where Winds Meet – DMG Optimizer
          </h1>
          <Badge>Realtime</Badge>
        </div>

        {/* STATUS BAR */}
        <StatusBar />

        {/* CONTENT */}
        <MainContent />
      </div>
    </div>
  );
}
