"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagListInput } from "./TagListInput";
import {
  useCreateFeatureMutation,
  useGetFeatureQuery,
  useUpdateFeatureMutation,
  type FeatureCreatePayload,
} from "@/lib/api/featureApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";

type FeatureFormValues = FeatureCreatePayload;

const EMPTY_DEFAULTS: FeatureFormValues = {
  size: [],
  categoryEnglish: [],
  categoryPolish: [],
  vendorsEnglish: [],
  vendorPolish: [],
  fabricEnglish: [],
  fabricPolish: [],
  genderEnglish: [],
  genderPolish: [],
  colorsEnglish: [],
  colorsPolish: [],
  conditionEnglish: [],
  conditionPolish: [],
  featureEnglish: [],
  featurePolish: [],
  isPublished: false,
  status: "active",
};

type BilingualField = {
  label: string;
  englishKey: keyof Pick<
    FeatureFormValues,
    | "categoryEnglish"
    | "vendorsEnglish"
    | "fabricEnglish"
    | "genderEnglish"
    | "colorsEnglish"
    | "conditionEnglish"
    | "featureEnglish"
  >;
  polishKey: keyof Pick<
    FeatureFormValues,
    | "categoryPolish"
    | "vendorPolish"
    | "fabricPolish"
    | "genderPolish"
    | "colorsPolish"
    | "conditionPolish"
    | "featurePolish"
  >;
};

const BILINGUAL_FIELDS: BilingualField[] = [
  {
    label: "Category",
    englishKey: "categoryEnglish",
    polishKey: "categoryPolish",
  },
  {
    label: "Brand / Vendor",
    englishKey: "vendorsEnglish",
    polishKey: "vendorPolish",
  },
  { label: "Fabric", englishKey: "fabricEnglish", polishKey: "fabricPolish" },
  { label: "Gender", englishKey: "genderEnglish", polishKey: "genderPolish" },
  { label: "Colors", englishKey: "colorsEnglish", polishKey: "colorsPolish" },
  {
    label: "Condition",
    englishKey: "conditionEnglish",
    polishKey: "conditionPolish",
  },
  { label: "Feature", englishKey: "featureEnglish", polishKey: "featurePolish" },
];

export default function FeatureSettingsForm() {
  const { data, isLoading } = useGetFeatureQuery();
  const [createFeature, { isLoading: isCreating }] =
    useCreateFeatureMutation();
  const [updateFeature, { isLoading: isUpdating }] =
    useUpdateFeatureMutation();

  const form = useForm<FeatureFormValues>({
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!data?.data) return;
    const record = data.data;
    form.reset({
      size: record.size ?? [],
      categoryEnglish: record.categoryEnglish ?? [],
      categoryPolish: record.categoryPolish ?? [],
      vendorsEnglish: record.vendorsEnglish ?? [],
      vendorPolish: record.vendorPolish ?? [],
      fabricEnglish: record.fabricEnglish ?? [],
      fabricPolish: record.fabricPolish ?? [],
      genderEnglish: record.genderEnglish ?? [],
      genderPolish: record.genderPolish ?? [],
      colorsEnglish: record.colorsEnglish ?? [],
      colorsPolish: record.colorsPolish ?? [],
      conditionEnglish: record.conditionEnglish ?? [],
      conditionPolish: record.conditionPolish ?? [],
      featureEnglish: record.featureEnglish ?? [],
      featurePolish: record.featurePolish ?? [],
      isPublished: record.isPublished ?? false,
      status: record.status ?? "active",
    });
  }, [data, form]);

  const onSubmit = async (values: FeatureFormValues) => {
    try {
      if (data?.data?.id) {
        const res = await updateFeature({
          id: data.data.id,
          body: values,
        }).unwrap();
        toast.success(res.message || "Feature settings updated");
      } else {
        const res = await createFeature(values).unwrap();
        toast.success(res.message || "Feature settings saved");
      }
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Feature Catalog</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set allowed dropdown values for AI result pages. English and Polish
          lists are used based on output language.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Controller
            name="size"
            control={form.control}
            render={({ field }) => (
              <TagListInput
                label="Size (language-neutral)"
                values={field.value}
                onChange={field.onChange}
                disabled={isSaving}
              />
            )}
          />

          {BILINGUAL_FIELDS.map(({ label, englishKey, polishKey }) => (
            <div key={englishKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Controller
                  name={englishKey}
                  control={form.control}
                  render={({ field }) => (
                    <TagListInput
                      label="English"
                      values={field.value}
                      onChange={field.onChange}
                      disabled={isSaving}
                    />
                  )}
                />
                <Controller
                  name={polishKey}
                  control={form.control}
                  render={({ field }) => (
                    <TagListInput
                      label="Polish"
                      values={field.value}
                      onChange={field.onChange}
                      disabled={isSaving}
                    />
                  )}
                />
              </div>
            </div>
          ))}

          {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            <div className="space-y-2">
              <Label>Published</Label>
              <Controller
                name="isPublished"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                    disabled={isSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSaving}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div> */}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-[#A825C7] hover:bg-purple-600"
              disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
