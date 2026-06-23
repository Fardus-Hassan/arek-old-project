"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Maximize,
  Image as ImageIcon,
  UserCircle2,
  Eraser,
  Users,
  Ruler,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateDocumentMutation } from "@/lib/api/documentApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import {
  clearGeneratedDocument,
  saveGeneratedDocument,
} from "@/lib/generated-document-storage";
import { normalizeDocumentApiData } from "@/lib/document-api-helpers";
import { mapGarmentOptionToApi } from "@/lib/garment-feature-map";

const options = [
  { id: "dimensions", label: "Physical Dimensions", icon: Maximize },
  { id: "try-on", label: "AI virtual try-on", icon: ImageIcon },
  { id: "mannequin", label: "Mannequin", icon: UserCircle2 },
  { id: "removal", label: "Background removal", icon: Eraser },
  { id: "model", label: "Model", icon: Users },
  { id: "diagram", label: "Image diagram", icon: Ruler },
];

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  selectedOptions: string[];
};

const newItemId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const HeroSection = () => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [language, setLanguage] = useState<"English" | "Polish">("English");
  const router = useRouter();
  const [createDocument, { isLoading: isGenerating }] =
    useCreateDocumentMutation();

  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, items.length - 1));
  }, [items.length]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        id: newItemId(),
        file,
        previewUrl: URL.createObjectURL(file),
        selectedOptions: [] as string[],
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg", ".webp"] },
    multiple: true,
    noClick: items.length > 0,
  });

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/jpg,image/webp";
    input.multiple = true;
    input.onchange = (e) => {
      const list = (e.target as HTMLInputElement).files;
      if (list?.length) onDrop(Array.from(list));
    };
    input.click();
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const toggleOption = (id: string) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeIndex
          ? {
              ...item,
              selectedOptions: item.selectedOptions.includes(id)
                ? item.selectedOptions.filter((x) => x !== id)
                : [...item.selectedOptions, id],
            }
          : item,
      ),
    );
  };

  const handleReset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setActiveIndex(0);
    setLanguage("English");
  };

  const handleGenerate = async () => {
    if (items.length === 0) return;
    // Immediately move to analyzing UI, and avoid redirecting from stale stored data.
    clearGeneratedDocument();
    sessionStorage.setItem("generationStartedAt", new Date().toISOString());
    router.push("/analyzing");

    const images = items.map((i) => i.file);
    const bodyData = JSON.stringify({
      features: items.map((i) => ({
        features:
          i.selectedOptions.length > 0
            ? i.selectedOptions.map(mapGarmentOptionToApi)
            : ["model"],
      })),
      language,
    });
    try {
      const res = await createDocument({ images, bodyData }).unwrap();
      const { document, generatedImageIds } = normalizeDocumentApiData(
        res.data,
      );
      saveGeneratedDocument(document, generatedImageIds);
      sessionStorage.setItem("generatedDocumentId", document.id);
      sessionStorage.removeItem("generationStartedAt");
      toast.success(res.message || "Generation started");
      // /analyzing will detect the saved payload and redirect to /ai-result
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
      router.push("/");
    }
  };

  const active = items[activeIndex];
  const activeSelected = active?.selectedOptions ?? [];

  return (
    <section className="py-10 lg:py-20 px-4 sm:px-6 bg-[#f7f9fa]">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center max-w-7xl mb-8 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 md:mb-6 tracking-tight leading-tight px-2">
            Upload garment photos. AI handles the rest.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-slate-500 max-w-2xl mx-auto px-2">
            Add one or more images. Pick an image below to set its features,
            then generate — no extra page.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-3xl mb-4">
          <div
            {...getRootProps()}
            className={`relative min-h-[200px] sm:min-h-[240px] rounded-3xl border-4 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-6 sm:p-8 text-center overflow-hidden
              ${isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-purple-100 hover:border-purple-200 bg-white shadow-sm"}
              ${items.length === 0 ? "cursor-pointer" : ""}
            `}>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-gradient-to-tr from-[#AD34DD] to-transparent transition-opacity duration-700 pointer-events-none" />
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {items.length === 0 ? (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center">
                  <div className="flex items-center justify-center mb-4 md:mb-6">
                    <Image
                      src="/images/heroImageIcon.svg"
                      alt="Upload icon"
                      width={40}
                      height={40}
                      className="w-8 h-8 md:w-10 md:h-10"
                      priority
                    />
                  </div>
                  <p className="text-slate-900 font-bold text-sm sm:text-base md:text-lg mb-2 px-4">
                    Drop images here or click to browse
                  </p>
                  <p className="text-slate-400 font-medium text-xs sm:text-sm">
                    JPG, PNG or WebP — multiple files allowed
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="has-files"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full space-y-4">
                  <p className="text-slate-600 text-sm font-medium">
                    {items.length} image{items.length !== 1 ? "s" : ""} added.
                    Drag more files here or use{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFilePicker();
                      }}
                      className="text-[#A825C7] font-semibold underline underline-offset-2">
                      Add more
                    </button>
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`relative shrink-0 snap-start rounded-2xl border-2 overflow-hidden w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 ${
                          idx === activeIndex
                            ? "border-[#A825C7] ring-2 ring-[#A825C7]/30"
                            : "border-gray-200"
                        }`}>
                        <button
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className="absolute inset-0 z-0"
                          aria-label={`Select image ${idx + 1}`}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="absolute top-1 right-1 z-10 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
                          aria-label="Remove image">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] sm:text-xs py-0.5 text-center pointer-events-none">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  {active && (
                    <p className="text-left text-xs sm:text-sm text-slate-500 truncate">
                      Editing features for:{" "}
                      <span className="font-medium text-slate-800">
                        {active.file.name}
                      </span>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="text-slate-400 text-xs sm:text-sm mb-6 md:mb-10 font-medium text-center max-w-xl">
          Select a thumbnail, then toggle AI features for that image only. Each
          image can use different options.
        </p>

        <div className="w-full max-w-5xl mb-4 flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Output language
          </p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "English" | "Polish")}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="English">English</option>
            <option value="Polish">Polish</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 w-full max-w-5xl mb-10 sm:mb-12">
          {options.map((option, index) => {
            const Icon = option.icon;
            const isSelected = activeSelected.includes(option.id);
            const disabled = items.length === 0;

            return (
              <motion.button
                key={option.id}
                type="button"
                disabled={disabled}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={
                  disabled
                    ? {}
                    : {
                        y: -5,
                        boxShadow: "0 10px 15px -3px rgb(168 37 199 / 0.1)",
                        borderColor: "rgba(168, 37, 199, 0.5)",
                      }
                }
                whileTap={disabled ? {} : { scale: 0.96 }}
                transition={{
                  delay: 0.15 + index * 0.04,
                  y: { duration: 0.2 },
                }}
                onClick={() => toggleOption(option.id)}
                className={`flex flex-col items-center justify-center p-3 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all duration-300 bg-white
                        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
                        ${isSelected ? "border-[#A825C7]!" : "border-[#E5BEEE]"}
                      `}>
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-2 md:mb-4 transition-colors
                          ${isSelected ? "bg-[#F9F1FB]" : "bg-slate-100"}
                        `}>
                  <Icon
                    size={18}
                    className={`${
                      isSelected ? "text-[#A825C7]" : "text-slate-400"
                    } md:w-[20px] md:h-[20px]`}
                  />
                </div>
                <span
                  className={`text-[10px] sm:text-xs md:text-sm font-bold text-center leading-tight ${
                    isSelected ? "text-slate-900" : "text-slate-400"
                  }`}>
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full max-w-md">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 md:py-4 px-4 md:px-8 rounded-xl border border-slate-200 text-sm md:text-base text-slate-700 font-bold hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <motion.button
            type="button"
            disabled={items.length === 0 || isGenerating}
            whileHover={
              items.length > 0 && !isGenerating
                ? { scale: 1.02, backgroundColor: "#9629BF" }
                : {}
            }
            whileTap={
              items.length > 0 && !isGenerating ? { scale: 0.98 } : {}
            }
            onClick={() => void handleGenerate()}
            className={`flex-1 py-3 md:py-4 px-4 md:px-8 rounded-xl font-bold text-sm md:text-base transition-all shadow-lg shadow-purple-200
              ${
                items.length > 0 && !isGenerating
                  ? "bg-[#AD34DD] text-white hover:bg-[#9629BF]"
                  : "bg-purple-200 text-white cursor-not-allowed"
              }
            `}>
            {isGenerating ? "Starting…" : "Generate"}
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
