"use client";

import { useState, useEffect } from "react";
import PetalLoader from "@/components/ui/PetalLoader";
import { useRouter } from "next/navigation";
import { loadGeneratedDocument } from "@/lib/generated-document-storage";
import { playNotificationSound } from "@/lib/notification-sound";

export default function AnalyzContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(25);
  const router = useRouter();
  const steps = [
    { step: 1, label: "Upload", duration: 2000 },
    { step: 2, label: "AI Processing", duration: 3000 },
    { step: 3, label: "Verification", duration: 2500 },
    { step: 4, label: "Auto-List", duration: 1500 },
  ];

  useEffect(() => {
    // UX: stay on Step 1 (Upload) until we have a response.
  }, []);

  useEffect(() => {
    const startedAtRaw =
      typeof window !== "undefined"
        ? sessionStorage.getItem("generationStartedAt")
        : null;

    let finishing = false;

    const parseMs = (raw: string | null | undefined): number | null => {
      if (!raw) return null;
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : null;
    };

    const tick = () => {
      const payload = loadGeneratedDocument();
      const startedAtMs = parseMs(startedAtRaw) ?? 0;
      const savedAtMs =
        parseMs(payload?.savedAt) ??
        parseMs(payload?.document?.updatedAt) ??
        parseMs(payload?.document?.createdAt) ??
        0;
      const expectedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("generatedDocumentId")
          : null;
      const idMatches = Boolean(
        expectedId && payload?.document?.id === expectedId,
      );
      const timeOk =
        startedAtMs <= 0 ||
        (savedAtMs > 0 && savedAtMs >= startedAtMs);

      if (!finishing && payload?.document?.id && (idMatches || timeOk)) {
        finishing = true;
        // Finish remaining steps quickly (about 2 seconds total)
        setCurrentStep(2);
        setProgress(50);
        const t1 = setTimeout(() => {
          setCurrentStep(3);
          setProgress(75);
        }, 700);
        const t2 = setTimeout(() => {
          setCurrentStep(4);
          setProgress(100);
          playNotificationSound();
        }, 1400);
        const t3 = setTimeout(() => {
          router.push("/ai-result");
        }, 2000);
        timeouts.push(t1, t2, t3);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    const timeouts: NodeJS.Timeout[] = [];
    return () => {
      clearInterval(interval);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="font-medium text-3xl sm:text-4xl text-gray-900">
            Analyzing Your Garment Photo...
          </h1>
          <p className="text-base sm:text-lg text-[#4A5565] mt-4 max-w-2xl mx-auto">
            Just a moment while we measure and generate your product listing.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white border border-[#D1D1D1] rounded-2xl w-full p-6 sm:p-12 shadow-sm">
          <div className="relative py-5">
            {/* Progress Line */}
            <div
              className="absolute top-9 sm:top-11 left-0 h-1 bg-gray-200 rounded-full"
              style={{ width: "calc(100% - 2rem)", left: "1rem" }}></div>

            {/* Active Progress Line */}
            <div
              className="absolute top-9 sm:top-11 left-0 h-1 bg-[#A825C7] rounded-full transition-all duration-500 ease-in-out"
              style={{
                width: `calc(${progress}% - 2rem)`,
                left: "1rem",
              }}></div>

            {/* Progress Steps */}
            <div className="relative flex items-center justify-between">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center">
                  {/* Step Circle */}
                  <div
                    className={`w-8 sm:h-12 h-8 sm:w-12 rounded-xl flex items-center justify-center font-semibold text-sm sm:text-lg z-10 ${
                      item.step <= currentStep
                        ? "bg-[#A825C7] text-white"
                        : "border border-[#4A5565] text-[#4A5565] bg-white"
                    }`}>
                    {item.step}
                  </div>
                  {/* Step Label */}
                  <span className="mt-3 text-sm font-medium text-[#4A5565] whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        <div className="mt-8">
          <PetalLoader size={300} />
          <p className="text-[#4A5565] text-base text-center mt-6">
            AI handles the measurements, cleanups, tagging, and more. This
            usually takes less than a minute.....
          </p>
        </div>
      </div>
    </div>
  );
}
