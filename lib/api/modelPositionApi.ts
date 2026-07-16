import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

export type ModelPositionRecord = {
  id: string;
  position: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ModelPositionPayload = {
  position: string[];
};

export const modelPositionApi = createApi({
  reducerPath: "modelPositionApi",
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
  tagTypes: ["ModelPosition"],
  endpoints: (builder) => ({
    getModelPosition: builder.query<ApiEnvelope<ModelPositionRecord>, void>({
      query: () => ({ url: "/model-position", method: "GET" }),
      providesTags: ["ModelPosition"],
    }),
    createModelPosition: builder.mutation<
      ApiEnvelope<ModelPositionRecord>,
      ModelPositionPayload
    >({
      query: (body) => ({ url: "/model-position", method: "POST", body }),
      invalidatesTags: ["ModelPosition"],
    }),
    updateModelPosition: builder.mutation<
      ApiEnvelope<ModelPositionRecord>,
      { id: string; body: ModelPositionPayload }
    >({
      query: ({ id, body }) => ({
        url: `/model-position/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ModelPosition"],
    }),
    deleteModelPosition: builder.mutation<
      ApiEnvelope<ModelPositionRecord>,
      string
    >({
      query: (id) => ({ url: `/model-position/${id}`, method: "DELETE" }),
      invalidatesTags: ["ModelPosition"],
    }),
  }),
});

export const {
  useGetModelPositionQuery,
  useCreateModelPositionMutation,
  useUpdateModelPositionMutation,
  useDeleteModelPositionMutation,
} = modelPositionApi;
