"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const DMGOptimizerClient = dynamic(() => import("./DMGOptimizerClient"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DMGOptimizerClient />
    </Suspense>
  );
}
