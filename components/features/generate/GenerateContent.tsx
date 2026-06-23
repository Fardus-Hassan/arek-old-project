"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Maximize,
  ImageIcon,
  UserCircle2,
  Eraser,
  Users,
  Ruler,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateDocumentMutation } from "@/lib/api/documentApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { saveGeneratedDocument } from "@/lib/generated-document-storage";
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

const unsplashImagesUrls = [
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2FybWVudHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1521334884684-d80222895322?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z2FybWVudHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmFzaGlvbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
];

// Helper function to create a mock file from URL
const createMockFileFromUrl = (url: string, filename: string): File => {
  // Create a mock File object for preview purposes
  const blob = new Blob([], { type: "image/jpeg" });
  const file = new File([blob], filename, { type: "image/jpeg" }) as FileWithPreview;
  // Attach URL as a property for preview
  file.previewUrl = url;
  return file;
};

interface FileWithPreview extends File {
  previewUrl?: string;
}

export default function GenerateContent() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedOptionsByIndex, setSelectedOptionsByIndex] = useState<
    Record<number, string[]>
  >({});
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [language, setLanguage] = useState<"English" | "Polish">("English");
  const router = useRouter();
  const [createDocument, { isLoading: isGenerating }] =
    useCreateDocumentMutation();
  // Load mock images on component mount
  useEffect(() => {
    const loadMockImages = () => {
      const mockFiles = unsplashImagesUrls.map((url, index) =>
        createMockFileFromUrl(url, `garment-${index + 1}.jpg`),
      );
      setFiles(mockFiles);
    };

    // Use setTimeout to defer the state update
    const timer = setTimeout(loadMockImages, 0);
    return () => clearTimeout(timer);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles((prev) => [
        ...prev,
        ...acceptedFiles.map((file) => file as FileWithPreview),
      ]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg"] },
    multiple: true,
  });

  const toggleOption = (id: string) => {
    setSelectedOptionsByIndex((prev) => {
      const cur = prev[activeImageIndex] ?? [];
      const next = cur.includes(id)
        ? cur.filter((item) => item !== id)
        : [...cur, id];
      return { ...prev, [activeImageIndex]: next };
    });
  };

  const handleReset = () => {
    // Reset to original mock images
    const mockFiles = unsplashImagesUrls.map((url, index) =>
      createMockFileFromUrl(url, `garment-${index + 1}.jpg`),
    );
    setFiles(mockFiles);
    setSelectedOptionsByIndex({});
    setActiveImageIndex(0);
    setLanguage("English");
  };

  const handleRemoveImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedOptionsByIndex((prev) => {
      const next: Record<number, string[]> = {};
      for (const [k, v] of Object.entries(prev)) {
        const i = Number(k);
        if (!Number.isFinite(i) || i === index) continue;
        next[i > index ? i - 1 : i] = v;
      }
      return next;
    });
    if (activeImageIndex === index) {
      setActiveImageIndex(0);
    } else if (activeImageIndex > index) {
      setActiveImageIndex((prev) => prev - 1);
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;
    const realFiles = files.filter((file) => !file.previewUrl);
    if (realFiles.length === 0) {
      toast.error("Please upload at least one real image to generate.");
      return;
    }
    const featuresPayload = files
      .map((f, idx) => ({ f, idx }))
      .filter(({ f }) => !f.previewUrl)
      .map(({ idx }) => {
        const selected = selectedOptionsByIndex[idx] ?? [];
        const mapped = selected.map(mapGarmentOptionToApi);
        return {
          features: mapped.length > 0 ? mapped : ["model"],
        };
      });

    const bodyData = JSON.stringify({
      features: featuresPayload,
      language,
    });
    try {
      const res = await createDocument({
        images: realFiles,
        bodyData,
      }).unwrap();
      const { document, generatedImageIds } = normalizeDocumentApiData(
        res.data,
      );
      saveGeneratedDocument(document, generatedImageIds);
      sessionStorage.setItem("generatedDocumentId", document.id);
      sessionStorage.removeItem("generationStartedAt");
      toast.success(res.message || "Generation started");
      router.push("/analyzing");
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const activeFile = files[activeImageIndex];
  const selectedOptions = selectedOptionsByIndex[activeImageIndex] ?? [];

  // Helper function to get image preview URL
  const getPreviewUrl = (file: FileWithPreview) => {
    // Check if it's a mock file with previewUrl
    if (file.previewUrl) {
      return file.previewUrl;
    }
    // Otherwise create object URL for user-uploaded files
    return URL.createObjectURL(file);
  };

  return (
    <section className="py-6 sm:py-8 md:py-10 lg:py-20 px-4 sm:px-6 bg-[#f7f9fa] min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col items-center w-full">
        {/* Header content */}
        <div className="text-center w-full max-w-7xl mb-6 sm:mb-8 md:mb-12 px-2 sm:px-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 sm:mb-4 md:mb-6 tracking-tight leading-tight px-2 sm:px-4">
            Upload a garment photo. AI handles the rest.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-slate-500 max-w-2xl mx-auto px-4 sm:px-6">
            Automatically measure, clean, visualize, and generate product
            listings from a single image.
          </motion.p>
        </div>

        {/* Upload Box Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-2xl mb-6 sm:mb-8 px-2 sm:px-0">
          <div
            {...getRootProps()}
            className={`relative aspect-video rounded-2xl sm:rounded-3xl border-2 sm:border-4 transition-all duration-500 cursor-pointer flex flex-col items-center justify-center text-center overflow-hidden
              ${
                isDragActive
                  ? "border-[#E5BEEE] bg-[#F9F1FB]"
                  : "border-purple-100 hover:border-purple-200 bg-white shadow-sm"
              }
            `}>
            <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-gradient-to-tr from-[#AD34DD] to-transparent transition-opacity duration-700 pointer-events-none" />

            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {activeFile ? (
                <motion.div
                  key={`preview-${activeImageIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex items-center justify-center relative">
                  <Image
                    src={getPreviewUrl(activeFile) || "/placeholder.svg"}
                    alt="Preview"
                    fill
                    className="object-cover rounded-xl sm:rounded-2xl"
                    unoptimized={true}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center px-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-purple-50 flex items-center justify-center mb-3 sm:mb-4">
                    <ImageIcon className="text-[#A825C7] w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                  </div>
                  <p className="text-slate-900 font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
                    Drop your garment images here
                  </p>
                  <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm">
                    or click to browse
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Image Thumbnails Gallery */}
        <div className="relative w-full mb-6 sm:mb-8 flex justify-center px-2 sm:px-0">
          <div className="flex items-center gap-0 max-w-2xl w-full">
            {/* Add More Button - Fixed Position Left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: files.length * 0.05 }}
              className="shrink-0 group">
              <div
                {...getRootProps()}
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg border-2 border-slate-300 hover:border-slate-400 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-50 bg-white">
                <Plus className="w-6 h-6 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-600" />
              </div>
            </motion.div>

            {/* ScrollArea for Thumbnails */}
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1">
                <ScrollArea className="w-full px-2 sm:px-4 py-2">
                  <div className="flex items-center justify-start gap-2 sm:gap-3">
                    {files.map((file, index) => (
                      <motion.div
                        key={`${file.name}-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative group shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(index);
                          }}
                          className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all
                          ${
                            activeImageIndex === index
                              ? "border-slate-400 shadow-md"
                              : "border-slate-300 hover:border-slate-400"
                          }
                        `}>
                          <Image
                            src={getPreviewUrl(file) || "/placeholder.svg"}
                            alt={`Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                        </button>

                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10 shadow-md">
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </div>
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-5xl mb-6 sm:mb-8 px-2 sm:px-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              Output language
            </p>
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as "English" | "Polish")
              }
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="English">English</option>
              <option value="Polish">Polish</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 w-full max-w-5xl mb-8 sm:mb-10 md:mb-12 px-2 sm:px-0">
          {options.map((option, index) => {
            const Icon = option.icon;
            const isSelected = selectedOptions.includes(option.id);

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                whileHover={{
                  y: -5,
                  boxShadow: "0 10px 15px -3px rgb(168 37 199 / 0.1)",
                  borderColor: "rgba(168, 37, 199, 0.5)",
                }}
                whileTap={{ scale: 0.96 }}
                transition={{
                  delay: 0.3 + index * 0.05,
                  y: { duration: 0.2 },
                }}
                onClick={() => toggleOption(option.id)}
                className={`relative flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl md:rounded-2xl border-2 transition-all duration-300 bg-white min-h-[80px] sm:min-h-[100px] md:min-h-[120px]
                  ${isSelected ? "border-[#A825C7]!" : "border-[#E5BEEE]"}
                `}>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-[#A825C7] rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4 transition-colors
                    ${isSelected ? "bg-[#F9F1FB]" : "bg-slate-100"}
                  `}>
                  <Icon
                    className={`w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px] ${
                      isSelected ? "text-[#A825C7]" : "text-slate-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-center leading-tight ${
                    isSelected ? "text-slate-900" : "text-slate-400"
                  }`}>
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full max-w-[280px] sm:max-w-[320px] md:max-w-sm px-2 sm:px-0">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 md:px-8 rounded-lg sm:rounded-xl border border-slate-200 text-xs sm:text-sm md:text-base text-slate-700 font-bold hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <motion.button
            disabled={files.length === 0 || !files || isGenerating}
            whileHover={
              files.length > 0
                ? { scale: 1.02, backgroundColor: "#9629BF" }
                : {}
            }
            whileTap={files.length > 0 ? { scale: 0.98 } : {}}
            onClick={handleGenerate}
            className={`flex-1 py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 md:px-8 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all shadow-lg shadow-purple-200
              ${
                files.length > 0
                  ? "bg-[#AD34DD] text-white hover:bg-[#9629BF]"
                  : "bg-purple-200 text-white cursor-not-allowed"
              }
            `}>
            {isGenerating ? "Generating..." : "Generate"}
          </motion.button>
        </div>
      </div>
    </section>
  );
}
