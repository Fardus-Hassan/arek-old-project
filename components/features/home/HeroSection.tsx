"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
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
import { ImageGroupCard } from "./ImageGroupCard";
import { BulkUploadSection } from "./BulkUploadSection";
import { StickyFeatureBar } from "./StickyFeatureBar";
import {
  createEmptyGroup,
  type GroupSlot,
  type ImageGroup,
} from "./image-group-types";
import {
  sortFilesByName,
  spillFilesIntoGroups,
} from "./bulk-group-upload";

function revokeGroupPreviews(group: ImageGroup) {
  if (group.frontPreview) URL.revokeObjectURL(group.frontPreview);
  if (group.backPreview) URL.revokeObjectURL(group.backPreview);
}

function isGroupComplete(group: ImageGroup): boolean {
  return Boolean(group.front && group.back);
}

const HeroSection = () => {
  const [groups, setGroups] = useState<ImageGroup[]>([createEmptyGroup()]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [language, setLanguage] = useState<"English" | "Polish">("English");
  const router = useRouter();
  const [createDocument, { isLoading: isGenerating }] =
    useCreateDocumentMutation();

  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const groupCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    return () => {
      groupsRef.current.forEach(revokeGroupPreviews);
    };
  }, []);

  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupIndex(0);
      return;
    }
    setActiveGroupIndex((i) => Math.min(i, groups.length - 1));
  }, [groups.length]);

  const updateGroup = (
    groupId: string,
    updater: (group: ImageGroup) => ImageGroup,
  ) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? updater(g) : g)),
    );
  };

  const handleSlotFile = (groupId: string, slot: GroupSlot, file: File) => {
    updateGroup(groupId, (group) => {
      const previewKey = slot === "front" ? "frontPreview" : "backPreview";
      const fileKey = slot === "front" ? "front" : "back";
      const oldPreview = group[previewKey];
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      return {
        ...group,
        [fileKey]: file,
        [previewKey]: URL.createObjectURL(file),
      };
    });
  };

  const handleClearSlot = (groupId: string, slot: GroupSlot) => {
    updateGroup(groupId, (group) => {
      const previewKey = slot === "front" ? "frontPreview" : "backPreview";
      const fileKey = slot === "front" ? "front" : "back";
      const oldPreview = group[previewKey];
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      return {
        ...group,
        [fileKey]: null,
        [previewKey]: null,
      };
    });
  };

  const handleSwapSlots = (groupId: string) => {
    updateGroup(groupId, (group) => ({
      ...group,
      front: group.back,
      back: group.front,
      frontPreview: group.backPreview,
      backPreview: group.frontPreview,
    }));
  };

  const handleSlotFiles = (
    groupId: string,
    slot: GroupSlot,
    files: File[],
  ) => {
    if (files.length === 0) return;
    if (files.length === 1) {
      handleSlotFile(groupId, slot, files[0]!);
      return;
    }
    const groupIndex = groups.findIndex((g) => g.id === groupId);
    if (groupIndex < 0) return;
    setGroups((prev) =>
      spillFilesIntoGroups(prev, groupIndex, slot, sortFilesByName(files)),
    );
  };

  const applyBulkGroups = (newGroups: ImageGroup[]) => {
    if (newGroups.length === 0) return;
    const existingCount = groups.filter((g) => g.front || g.back).length;
    setGroups((prev) => {
      prev
        .filter((g) => !g.front && !g.back)
        .forEach(revokeGroupPreviews);
      const existing = prev.filter((g) => g.front || g.back);
      return [...existing, ...newGroups];
    });
    setActiveGroupIndex(existingCount);
  };

  const handleAddGroup = () => {
    setGroups((prev) => [...prev, createEmptyGroup()]);
    setActiveGroupIndex(groups.length);
  };

  const handleDeleteGroup = (groupId: string, index: number) => {
    setGroups((prev) => {
      const found = prev.find((g) => g.id === groupId);
      if (found) revokeGroupPreviews(found);
      return prev.filter((g) => g.id !== groupId);
    });
    if (activeGroupIndex >= index && activeGroupIndex > 0) {
      setActiveGroupIndex((i) => i - 1);
    }
  };

  const handleActiveGroupChange = (index: number) => {
    setActiveGroupIndex(index);
    const group = groups[index];
    if (!group) return;
    requestAnimationFrame(() => {
      groupCardRefs.current
        .get(group.id)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const toggleOption = (id: string) => {
    const activeGroup = groups[activeGroupIndex];
    if (!activeGroup) return;
    updateGroup(activeGroup.id, (group) => ({
      ...group,
      selectedOptions: group.selectedOptions.includes(id)
        ? group.selectedOptions.filter((x) => x !== id)
        : [...group.selectedOptions, id],
    }));
  };

  const handleReset = () => {
    groups.forEach(revokeGroupPreviews);
    setGroups([createEmptyGroup()]);
    setActiveGroupIndex(0);
    setLanguage("English");
  };

  const handleGenerate = async () => {
    if (groups.length === 0) {
      toast.error("Add at least one group with Front and Back images.");
      return;
    }

    const allComplete = groups.every(isGroupComplete);
    if (!allComplete) {
      toast.error(
        "Each group must include both a Front and a Back image.",
      );
      return;
    }

    clearGeneratedDocument();
    sessionStorage.setItem("generationStartedAt", new Date().toISOString());
    router.push("/analyzing");

    const images = groups.map((g) => g.front!);
    const backpartImages = groups.map((g) => g.back!);
    const bodyData = JSON.stringify({
      features: groups.map((g) => ({
        features:
          g.selectedOptions.length > 0
            ? g.selectedOptions.map(mapGarmentOptionToApi)
            : ["model"],
      })),
      language,
    });

    try {
      const res = await createDocument({
        images,
        backpartImages,
        bodyData,
      }).unwrap();
      const { document, generatedImageIds } = normalizeDocumentApiData(
        res.data,
      );
      saveGeneratedDocument(document, generatedImageIds);
      sessionStorage.setItem("generatedDocumentId", document.id);
      sessionStorage.removeItem("generationStartedAt");
      toast.success(res.message || "Generation started");
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
      router.push("/");
    }
  };

  const activeGroup = groups[activeGroupIndex];
  const activeSelected = activeGroup?.selectedOptions ?? [];
  const canGenerate = groups.length > 0 && groups.every(isGroupComplete);

  return (
    <section className="py-10 lg:py-20 px-4 sm:px-6 bg-[#f7f9fa] pb-44 sm:pb-36">
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
            Add images in groups (e.g., Front, Back). Upload many groups at
            once using bulk upload, or add images per group below.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-3xl mb-6 space-y-4">
          <BulkUploadSection onApply={applyBulkGroups} />

          {groups.map((group, index) => (
            <div
              key={group.id}
              ref={(el) => {
                if (el) groupCardRefs.current.set(group.id, el);
                else groupCardRefs.current.delete(group.id);
              }}>
              <ImageGroupCard
                group={group}
                index={index}
                isActive={index === activeGroupIndex}
                canDelete={groups.length > 1}
                onSelect={() => handleActiveGroupChange(index)}
                onDelete={() => handleDeleteGroup(group.id, index)}
                onSlotFile={(slot, file) => handleSlotFile(group.id, slot, file)}
                onSlotFiles={(slot, files) =>
                  handleSlotFiles(group.id, slot, files)
                }
                onClearSlot={(slot) => handleClearSlot(group.id, slot)}
                onSwapSlots={() => handleSwapSlots(group.id)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddGroup}
            className="w-full min-h-[56px] rounded-2xl border-2 border-dashed border-purple-200 bg-white hover:border-[#A825C7] hover:bg-[#F9F1FB] transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-700">
            <Plus className="w-4 h-4 text-[#A825C7]" />
            Add another group
          </button>
        </motion.div>

        <p className="text-slate-400 text-xs sm:text-sm mb-6 md:mb-10 font-medium text-center max-w-xl">
          Use the feature bar at the bottom to pick AI options per group. Drag a
          Front or Back image onto the other slot to swap them.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full max-w-md mb-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 md:py-4 px-4 md:px-8 rounded-xl border border-slate-200 text-sm md:text-base text-slate-700 font-bold hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <motion.button
            type="button"
            disabled={!canGenerate || isGenerating}
            whileHover={
              canGenerate && !isGenerating
                ? { scale: 1.02, backgroundColor: "#9629BF" }
                : {}
            }
            whileTap={canGenerate && !isGenerating ? { scale: 0.98 } : {}}
            onClick={() => void handleGenerate()}
            className={`flex-1 py-3 md:py-4 px-4 md:px-8 rounded-xl font-bold text-sm md:text-base transition-all shadow-lg shadow-purple-200
              ${
                canGenerate && !isGenerating
                  ? "bg-[#AD34DD] text-white hover:bg-[#9629BF]"
                  : "bg-purple-200 text-white cursor-not-allowed"
              }
            `}>
            {isGenerating ? "Starting…" : "Generate"}
          </motion.button>
        </div>
      </div>

      <StickyFeatureBar
        groupCount={groups.length}
        activeGroupIndex={activeGroupIndex}
        onActiveGroupChange={handleActiveGroupChange}
        selectedOptions={activeSelected}
        onToggleOption={toggleOption}
        language={language}
        onLanguageChange={setLanguage}
      />
    </section>
  );
};

export default HeroSection;
