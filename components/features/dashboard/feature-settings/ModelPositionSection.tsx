"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import {
  useCreateModelPositionMutation,
  useDeleteModelPositionMutation,
  useGetModelPositionQuery,
  useUpdateModelPositionMutation,
} from "@/lib/api/modelPositionApi";

/**
 * Canonical names that must match AI image labels (case/spacing flexible).
 * Keep these exact strings when re-adding after delete/edit mistakes.
 */
export const EXPECTED_MODEL_POSITION_NAMES = [
  "Model",
  "Virtual try on",
  "Measurement diagram",
  "Background Removed",
  "Back",
  "Mannequin",
] as const;

function reorderList(items: string[], from: number, to: number): string[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function ModelPositionSection() {
  const { data, isLoading, isFetching } = useGetModelPositionQuery();
  const [createModelPosition, { isLoading: isCreating }] =
    useCreateModelPositionMutation();
  const [updateModelPosition, { isLoading: isUpdating }] =
    useUpdateModelPositionMutation();
  const [deleteModelPosition, { isLoading: isDeleting }] =
    useDeleteModelPositionMutation();

  const [positions, setPositions] = useState<string[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [newPosition, setNewPosition] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const recordId = data?.data?.id;
  const isSaving = isCreating || isUpdating || isDeleting;
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (data?.data?.position) {
      setPositions(data.data.position);
    }
  }, [data?.data?.position]);

  const persistOrder = useCallback(
    async (nextPositions: string[]) => {
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      try {
        if (recordId && nextPositions.length === 0) {
          const res = await deleteModelPosition(recordId).unwrap();
          toast.success(res.message || "Model position deleted");
          return;
        }
        if (recordId) {
          const res = await updateModelPosition({
            id: recordId,
            body: { position: nextPositions },
          }).unwrap();
          toast.success(res.message || "Model position order saved");
        } else {
          const res = await createModelPosition({
            position: nextPositions,
          }).unwrap();
          toast.success(res.message || "Model position saved");
        }
      } catch (error) {
        toast.error(getRtkQueryErrorMessage(error));
        if (data?.data?.position) {
          setPositions(data.data.position);
        }
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [createModelPosition, data?.data?.position, deleteModelPosition, recordId, updateModelPosition],
  );

  const canDrag = !isSaving && editingIndex === null;

  const handleReorder = async (from: number, to: number) => {
    const next = reorderList(positions, from, to);
    if (next === positions) return;
    setPositions(next);
    await persistOrder(next);
  };

  const handleAdd = async () => {
    const nextValue = newPosition.trim();
    if (!nextValue) return;
    const next = [...positions, nextValue];
    setNewPosition("");
    setPositions(next);
    await persistOrder(next);
  };

  const beginEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(positions[index] ?? "");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const commitEdit = async () => {
    if (editingIndex === null) return;
    const v = editingValue.trim();
    if (!v) return;
    const next = [...positions];
    next[editingIndex] = v;
    setPositions(next);
    setEditingIndex(null);
    setEditingValue("");
    await persistOrder(next);
  };

  const handleDelete = async (index: number) => {
    const next = positions.filter((_, i) => i !== index);
    setPositions(next);
    if (editingIndex === index) cancelEdit();
    await persistOrder(next);
  };

  const showSkeleton = isLoading;
  const isEmpty = !isLoading && positions.length === 0;
  const hasRecord = Boolean(recordId);

  const helperText = useMemo(() => {
    if (editingIndex !== null) return "Edit the text, then click Save.";
    if (!hasRecord)
      return "Add items and drag to reorder. Saves automatically on changes.";
    return "Drag to reorder. Use edit/delete icons to update the list.";
  }, [editingIndex, hasRecord]);

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-purple-50 bg-gradient-to-r from-purple-50/80 via-white to-sky-50/50 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A825C7]/10 text-[#A825C7]">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Model Position
              </h2>
              {(isSaving || isFetching) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-[#A825C7]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isSaving ? "Saving…" : "Refreshing…"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {helperText}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div className="flex gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                Important — do not rename these fields
              </p>
              <p className="text-xs leading-relaxed text-amber-800/90">
                Position names must match AI image labels. If you edit or delete
                a name (or add a wrong one), image order on{" "}
                <span className="font-medium">/ai-result</span>, Documents, and
                CSV export can break. You may change order by drag — that is
                safe. If something was deleted by mistake, add it back using the
                exact names below:
              </p>
              <ol className="list-decimal space-y-0.5 pl-4 text-xs font-medium text-amber-950">
                {EXPECTED_MODEL_POSITION_NAMES.map((name) => (
                  <li key={name}>
                    <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px] text-amber-950">
                      {name}
                    </code>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Add position
            </label>
            <input
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
              disabled={isSaving}
              placeholder='e.g. "Model" (use exact names from the note above)'
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-300 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isSaving || !newPosition.trim()}
            className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A825C7] px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-50 sm:mt-6"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {showSkeleton ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
            <Layers className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">
              No model positions yet
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Add the exact names from the note above, then drag to set order.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {positions.map((position, index) => {
              const isDragging = dragFrom === index;
              const isOver =
                overIndex === index && dragFrom !== null && dragFrom !== index;
              const isEditingRow = editingIndex === index;

              return (
                <li
                  key={`${position}-${index}`}
                  draggable={canDrag}
                  onDragStart={(e) => {
                    if (!canDrag) return;
                    setDragFrom(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    if (!canDrag) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overIndex !== index) setOverIndex(index);
                  }}
                  onDrop={(e) => {
                    if (!canDrag) return;
                    e.preventDefault();
                    const fromRaw = e.dataTransfer.getData("text/plain");
                    const from = Number.parseInt(fromRaw, 10);
                    setDragFrom(null);
                    setOverIndex(null);
                    if (Number.isFinite(from)) {
                      void handleReorder(from, index);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border bg-white px-3 py-3 transition-all",
                    isSaving
                      ? "cursor-not-allowed opacity-70"
                      : canDrag
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-default",
                    isDragging && "scale-[0.98] border-purple-200 opacity-50",
                    isOver
                      ? "border-[#A825C7] bg-purple-50/40 ring-2 ring-[#A825C7]/20"
                      : "border-gray-200 hover:border-purple-200 hover:shadow-sm",
                  )}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors group-hover:bg-purple-50 group-hover:text-[#A825C7]">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#A825C7] text-xs font-bold text-white">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditingRow ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          disabled={isSaving}
                          className="h-9 w-full rounded-lg border border-purple-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-50"
                        />
                        <p className="text-[11px] text-gray-400">
                          Edit then Save • Drag disabled while editing
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {position}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Position {index + 1} of {positions.length}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isEditingRow ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving || !editingValue.trim()}
                          onClick={() => void commitEdit()}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-[#A825C7] transition-colors hover:bg-purple-100 disabled:opacity-50"
                          aria-label="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={cancelEdit}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => beginEdit(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleDelete(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
