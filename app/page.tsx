import { Suspense } from "react";
import DMGOptimizerClient from "./DMGOptimizerClient";


export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DMGOptimizerClient />
    </Suspense>
  );
}
