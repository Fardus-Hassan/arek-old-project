import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

export const shopifyApi = createApi({
  reducerPath: "shopifyApi",
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
  endpoints: (builder) => ({
    /** POST /shopify/upload-multiple-csv — form-data key `files` (1..n CSV File). */
    uploadMultipleCsv: builder.mutation<
      ApiEnvelope<unknown>,
      { files: File[] }
    >({
      query: ({ files }) => {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }
        return {
          url: "/shopify/upload-multiple-csv",
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
});

export const { useUploadMultipleCsvMutation } = shopifyApi;
