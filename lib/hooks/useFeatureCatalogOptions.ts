"use client";

import { useMemo } from "react";
import { useGetFeatureQuery } from "@/lib/api/featureApi";
import {
  getCatalogOptions,
  type CatalogOptions,
  type OutputLanguage,
} from "@/lib/feature-catalog";

export function useFeatureCatalogOptions(
  optionsLanguage: OutputLanguage,
): {
  catalog: CatalogOptions;
  isLoading: boolean;
  featureId: string | undefined;
} {
  const { data, isLoading } = useGetFeatureQuery();

  const catalog = useMemo(
    () => getCatalogOptions(data?.data, optionsLanguage),
    [data?.data, optionsLanguage],
  );

  return {
    catalog,
    isLoading,
    featureId: data?.data?.id,
  };
}
