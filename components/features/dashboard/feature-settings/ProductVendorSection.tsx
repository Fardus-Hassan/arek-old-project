"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagListInput } from "./TagListInput";
import {
  useCreateProductVendorsMutation,
  useDeleteAllProductVendorsMutation,
  useGetFeatureQuery,
  useUploadProductVendorsCsvMutation,
} from "@/lib/api/featureApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { cn } from "@/lib/utils";

export default function ProductVendorSection() {
  const { data, isLoading } = useGetFeatureQuery();
  const [uploadCsv, { isLoading: isUploading }] =
    useUploadProductVendorsCsvMutation();
  const [createVendors, { isLoading: isCreating }] =
    useCreateProductVendorsMutation();
  const [deleteAll, { isLoading: isDeleting }] =
    useDeleteAllProductVendorsMutation();

  const fileRef = useRef<HTMLInputElement>(null);
  const [draftVendors, setDraftVendors] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const vendors = data?.data?.productVendor ?? [];
  const busy = isUploading || isCreating || isDeleting;

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a CSV file.");
      return;
    }
    setSelectedFile(file);
  };

  const onUploadCsv = async () => {
    if (!selectedFile) {
      toast.error("Choose a CSV file first.");
      return;
    }
    try {
      const res = await uploadCsv(selectedFile).unwrap();
      toast.success(res.message || "Vendors uploaded from CSV");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const onAddVendors = async () => {
    if (!draftVendors.length) return;
    try {
      const res = await createVendors({ productVendors: draftVendors }).unwrap();
      toast.success(res.message || "Vendors added");
      setDraftVendors([]);
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const onDeleteAll = async () => {
    try {
      const res = await deleteAll().unwrap();
      toast.success(res.message || "All vendors deleted");
      setConfirmOpen(false);
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-gray-100 bg-gradient-to-b from-purple-50/40 to-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Brand / Vendor</h3>
          <p className="text-xs text-gray-500 mt-1">
            Upload a CSV or add vendors manually. Used in Brand dropdown on AI
            result pages.
          </p>
        </div>
        {vendors.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || isLoading}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete all vendors
          </Button>
        )}
      </div>

      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-[#A825C7] bg-purple-50/60"
            : "border-gray-200 bg-white",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
          <Upload className="h-5 w-5 text-[#A825C7]" />
        </div>
        <p className="text-sm font-medium text-gray-800">
          Drop vendor CSV here or browse
        </p>
        <p className="text-xs text-gray-500 mt-1">Only .csv files</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#A825C7] hover:bg-purple-600"
            disabled={busy || !selectedFile}
            onClick={onUploadCsv}>
            {isUploading ? "Uploading…" : "Upload CSV"}
          </Button>
        </div>
        {selectedFile && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-600">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#A825C7]" />
            {selectedFile.name}
          </p>
        )}
      </div>

      <TagListInput
        label="Add vendors manually"
        values={draftVendors}
        onChange={setDraftVendors}
        disabled={busy || isLoading}
        placeholder="Type vendor name and press Enter"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={busy || isLoading || draftVendors.length === 0}
          onClick={onAddVendors}>
          {isCreating ? "Adding…" : "Add vendors"}
        </Button>
      </div>

      {vendors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Current vendors ({vendors.length})
          </p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {vendors.map((v, i) => (
              <span
                key={`${v}-${i}`}
                className="inline-flex rounded-md bg-white px-2 py-1 text-xs text-gray-800 border border-gray-200">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 sm:p-8 bg-white rounded-xl text-center">
          <div className="mx-auto bg-red-50 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            Delete all vendors?
          </DialogTitle>
          <p className="text-sm text-gray-500">
            This removes every vendor from the catalog. Brand dropdowns will be
            empty until you upload or add vendors again.
          </p>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-center w-full">
            <Button
              variant="destructive"
              disabled={isDeleting}
              className="w-full sm:w-36 h-10 bg-red-500 hover:bg-red-600"
              onClick={onDeleteAll}>
              {isDeleting ? "Deleting…" : "Delete all"}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-36 h-10"
              onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
