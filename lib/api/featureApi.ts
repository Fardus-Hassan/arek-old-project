import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

export type FeatureRecord = {
  id: string;
  size: string[];
  categoryEnglish: string[];
  categoryPolish: string[];
  vendorsEnglish?: string[];
  vendorPolish?: string[];
  /** CSV-uploaded vendors for Brand dropdown */
  productVendor?: string[];
  fabricEnglish: string[];
  fabricPolish: string[];
  genderEnglish: string[];
  genderPolish: string[];
  colorsEnglish: string[];
  colorsPolish: string[];
  conditionEnglish: string[];
  conditionPolish: string[];
  featureEnglish: string[];
  featurePolish: string[];
  isPublished: boolean;
  status: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type FeatureSavePayload = Omit<
  FeatureRecord,
  "id" | "customFields" | "createdAt" | "updatedAt" | "productVendor" | "vendorsEnglish" | "vendorPolish"
>;

export type FeatureCreatePayload = FeatureSavePayload;

export type FeatureUpdatePayload = Partial<FeatureSavePayload>;

export type CreateProductVendorsPayload = {
  productVendors: string[];
};

export const featureApi = createApi({
  reducerPath: "featureApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      if (typeof window !== "undefined") {
        const token = getAccessToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Feature"],
  endpoints: (builder) => ({
    getFeature: builder.query<ApiEnvelope<FeatureRecord>, void>({
      query: () => ({ url: "/feature", method: "GET" }),
      providesTags: ["Feature"],
    }),
    createFeature: builder.mutation<
      ApiEnvelope<FeatureRecord>,
      FeatureCreatePayload
    >({
      query: (body) => ({ url: "/feature", method: "POST", body }),
      invalidatesTags: ["Feature"],
    }),
    updateFeature: builder.mutation<
      ApiEnvelope<FeatureRecord>,
      { id: string; body: FeatureUpdatePayload }
    >({
      query: ({ id, body }) => ({
        url: `/feature/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Feature"],
    }),
    uploadProductVendorsCsv: builder.mutation<ApiEnvelope<unknown>, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/csv/product-vendors",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Feature"],
    }),
    createProductVendors: builder.mutation<
      ApiEnvelope<unknown>,
      CreateProductVendorsPayload
    >({
      query: (body) => ({
        url: "/csv/create-product-vendor",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Feature"],
    }),
    deleteAllProductVendors: builder.mutation<ApiEnvelope<unknown>, void>({
      query: () => ({
        url: "/csv/product-vendor",
        method: "DELETE",
      }),
      invalidatesTags: ["Feature"],
    }),
  }),
});

export const {
  useGetFeatureQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useUploadProductVendorsCsvMutation,
  useCreateProductVendorsMutation,
  useDeleteAllProductVendorsMutation,
} = featureApi;
