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
  vendorsEnglish: string[];
  vendorPolish: string[];
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

export type FeatureCreatePayload = Omit<
  FeatureRecord,
  "id" | "customFields" | "createdAt" | "updatedAt"
>;

export type FeatureUpdatePayload = Partial<FeatureCreatePayload>;

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
  }),
});

export const {
  useGetFeatureQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
} = featureApi;
