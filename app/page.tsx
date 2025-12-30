import { Suspense } from "react";
import { DMGOptimizer } from "./DMGOptimizerClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DMGOptimizer />
    </Suspense>
  );
}
