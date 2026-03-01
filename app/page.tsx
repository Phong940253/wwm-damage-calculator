"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useI18n } from "./providers/I18nProvider";

const DMGOptimizerClient = dynamic(() => import("./DMGOptimizerClient"), {
  ssr: false,
});

export default function Page() {
  const { t } = useI18n();

  return (
    <Suspense fallback={<div className="p-6">{t("app.loading")}</div>}>
      <DMGOptimizerClient />
    </Suspense>
  );
}
