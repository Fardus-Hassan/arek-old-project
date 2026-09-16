"use client";

import { Suspense } from "react";
import AnalyzContent from "../features/analyzing/AnalyzContent";

export default function AnalyzingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center text-slate-500">
          Loading…
        </div>
      }>
      <AnalyzContent />
    </Suspense>
  );
}
