"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PetalLoader from "@/components/ui/PetalLoader";
import { useRouter, useSearchParams } from "next/navigation";
import { playNotificationSound } from "@/lib/notification-sound";
import {
  useLazyGetProductByIdQuery,
} from "@/lib/api/documentApi";
import {
  clampPollSeconds,
  DEFAULT_POLL_SECONDS,
  parseProductStatus,
  resolveProductId,
  saveActiveProductId,
  wrapAiProductAsDocument,
} from "@/lib/ai-product-helpers";
import {
  persistGenerationLanguage,
  readGenerationLanguage,
} from "@/lib/feature-catalog";
import { saveGeneratedDocument } from "@/lib/generated-document-storage";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { Button } from "@/components/ui/button";

export default function AnalyzContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(25);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fetchProduct] = useLazyGetProductByIdQuery();
  const finishingRef = useRef(false);
  const inFlightRef = useRef(false);

  const productId = useMemo(
    () => resolveProductId(searchParams.get("productId")),
    [searchParams],
  );

  const pollSeconds = useMemo(
    () => clampPollSeconds(searchParams.get("poll") ?? DEFAULT_POLL_SECONDS),
    [searchParams],
  );

  // Keep productId in URL + storage when only one side has it
  useEffect(() => {
    if (!productId) return;
    saveActiveProductId(productId);
    const urlId = searchParams.get("productId")?.trim();
    if (urlId === productId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("productId", productId);
    if (!params.get("poll")) params.set("poll", String(pollSeconds));
    router.replace(`/analyzing?${params.toString()}`);
  }, [productId, pollSeconds, router, searchParams]);

  const goToResult = useCallback(() => {
    if (!productId) return;
    router.push(`/ai-result?productId=${encodeURIComponent(productId)}`);
  }, [productId, router]);

  const checkStatus = useCallback(async () => {
    if (!productId || finishingRef.current || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetchProduct(productId).unwrap();
      setLastCheckedAt(new Date().toISOString());
      const product = res.data;
      if (!product?.id) return;

      const phase = parseProductStatus(product.status);
      if (phase === "failed") {
        finishingRef.current = true;
        setFailMessage(
          res.message ||
            "AI generation failed. Please try again from the home page.",
        );
        setCurrentStep(1);
        setProgress(25);
        return;
      }

      if (phase === "completed") {
        finishingRef.current = true;
        const document = wrapAiProductAsDocument(product);
        const lang = readGenerationLanguage();
        persistGenerationLanguage(lang);
        saveGeneratedDocument(document, [], lang);
        saveActiveProductId(product.id);

        setCurrentStep(2);
        setProgress(50);
        window.setTimeout(() => {
          setCurrentStep(3);
          setProgress(75);
        }, 700);
        window.setTimeout(() => {
          setCurrentStep(4);
          setProgress(100);
          playNotificationSound();
        }, 1400);
        window.setTimeout(() => {
          goToResult();
        }, 2000);
        return;
      }

      // still processing
      setCurrentStep((s) => Math.max(s, 2));
      setProgress((p) => Math.max(p, 50));
    } catch (error) {
      setLastCheckedAt(new Date().toISOString());
      // Keep polling on transient errors; only show soft message
      console.warn("[analyzing] poll error", getRtkQueryErrorMessage(error));
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchProduct, goToResult, productId]);

  useEffect(() => {
    if (!productId || failMessage) return;
    void checkStatus();
    const id = window.setInterval(() => {
      void checkStatus();
    }, pollSeconds * 1000);
    return () => window.clearInterval(id);
  }, [checkStatus, failMessage, pollSeconds, productId]);

  const steps = [
    { step: 1, label: "Upload" },
    { step: 2, label: "AI Processing" },
    { step: 3, label: "Verification" },
    { step: 4, label: "Auto-List" },
  ];

  if (!productId) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">
            No product to analyze
          </h1>
          <p className="text-sm text-slate-500">
            Start a new generation from the home page, or open a link that
            includes a product id.
          </p>
          <Button type="button" onClick={() => router.push("/")}>
            Go home
          </Button>
        </div>
      </div>
    );
  }

  if (failMessage) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">
            Generation failed
          </h1>
          <p className="text-sm text-rose-600">{failMessage}</p>
          <p className="text-xs text-slate-400 break-all">Product: {productId}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Try again
            </Button>
            <Button
              type="button"
              onClick={() => {
                finishingRef.current = false;
                setFailMessage(null);
                void checkStatus();
              }}>
              Check again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="font-medium text-3xl sm:text-4xl text-gray-900">
            Analyzing Your Garment Photo...
          </h1>
          <p className="text-base sm:text-lg text-[#4A5565] mt-4 max-w-2xl mx-auto">
            AI may take a while (sometimes hours). We check every{" "}
            <span className="font-semibold text-slate-800">{pollSeconds}s</span>{" "}
            whether your result is ready.
          </p>
        </div>

        <div className="bg-white border border-[#D1D1D1] rounded-2xl w-full p-6 sm:p-12 shadow-sm">
          <div className="relative py-5">
            <div
              className="absolute top-9 sm:top-11 left-0 h-1 bg-gray-200 rounded-full"
              style={{ width: "calc(100% - 2rem)", left: "1rem" }}
            />
            <div
              className="absolute top-9 sm:top-11 left-0 h-1 bg-[#A825C7] rounded-full transition-all duration-500 ease-in-out"
              style={{
                width: `calc(${progress}% - 2rem)`,
                left: "1rem",
              }}
            />
            <div className="relative flex items-center justify-between">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 sm:h-12 h-8 sm:w-12 rounded-xl flex items-center justify-center font-semibold text-sm sm:text-lg z-10 ${
                      item.step <= currentStep
                        ? "bg-[#A825C7] text-white"
                        : "border border-[#4A5565] text-[#4A5565] bg-white"
                    }`}>
                    {item.step}
                  </div>
                  <span className="mt-3 text-sm font-medium text-[#4A5565] whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <PetalLoader size={300} />
          <p className="text-[#4A5565] text-base text-center mt-6">
            Checking status every {pollSeconds} seconds. You can leave this tab
            open — we will open the result when it is ready.
          </p>
          <p className="text-xs text-slate-400 text-center mt-2 break-all">
            Product id: {productId}
            {lastCheckedAt
              ? ` · Last check ${new Date(lastCheckedAt).toLocaleTimeString()}`
              : null}
          </p>
        </div>
      </div>
    </div>
  );
}
