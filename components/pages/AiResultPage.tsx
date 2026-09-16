"use client";

import { Suspense } from "react";
import AiResultContent from "../features/ai-result/AiResultContent";

export default function AiResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          Loading result…
        </div>
      }>
      <AiResultContent />
    </Suspense>
  );
}
