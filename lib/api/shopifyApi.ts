import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

export type ShopifyMetafieldResult = {
  namespace?: string;
  key?: string;
  value?: unknown;
  type?: string;
  success?: boolean;
  error?: unknown;
  [key: string]: unknown;
};

export type ShopifySkippedMetafield = {
  namespace?: string;
  key?: string;
  reason?: string;
  [key: string]: unknown;
};

export type ShopifyUploadProductResult = {
  handle?: string;
  title?: string;
  success?: boolean;
  shopifyProductId?: number | string | null;
  adminUrl?: string | null;
  error?: string;
  errorMessage?: string;
  metafieldResults?: ShopifyMetafieldResult[];
  skippedMetafields?: ShopifySkippedMetafield[];
  publish?: {
    success?: boolean;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ShopifyUploadHistoryRecord = {
  id: string;
  userId?: string;
  generatedImageId?: string | null;
  handle?: string | null;
  title?: string | null;
  success?: boolean;
  shopifyProductId?: string | number | null;
  adminUrl?: string | null;
  errorMessage?: string | null;
  result?: ShopifyUploadProductResult | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type ShopifyUploadHistoryMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  [key: string]: unknown;
};

export type ShopifyUploadHistoryListResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  meta: ShopifyUploadHistoryMeta;
  data: ShopifyUploadHistoryRecord[];
};

export type ShopifyUploadMultipleResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: ShopifyUploadProductResult[];
  [key: string]: unknown;
};

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
  tagTypes: ["ShopifyUploadHistory"],
  endpoints: (builder) => ({
    /**
     * POST /shopify/upload-multiple-csv
     * form-data: files + bodyData JSON { generatedImageIds: string[] }
     */
    uploadMultipleCsv: builder.mutation<
      ShopifyUploadMultipleResponse,
      { files: File[]; generatedImageIds?: string[] }
    >({
      query: ({ files, generatedImageIds }) => {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }
        /**
         * Index-align ids with files. Do NOT strip empty slots — that desyncs
         * generatedImageId[i] from files[i] and can attach history to the wrong product.
         */
        if (generatedImageIds && generatedImageIds.length > 0) {
          const aligned = files.map((_, i) =>
            String(generatedImageIds[i] ?? "").trim(),
          );
          formData.append(
            "bodyData",
            JSON.stringify({ generatedImageIds: aligned }),
          );
        }
        return {
          url: "/shopify/upload-multiple-csv",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["ShopifyUploadHistory"],
    }),

    /** GET /shopify/upload-history */
    getShopifyUploadHistory: builder.query<
      ShopifyUploadHistoryListResponse,
      { page?: number; limit?: number; generatedImageId?: string }
    >({
      query: (params) => ({
        url: "/shopify/upload-history",
        method: "GET",
        params,
      }),
      providesTags: ["ShopifyUploadHistory"],
    }),

    /** GET /shopify/upload-history/:id */
    getShopifyUploadHistoryById: builder.query<
      ApiEnvelope<ShopifyUploadHistoryRecord>,
      string
    >({
      query: (id) => ({
        url: `/shopify/upload-history/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, id) => [
        { type: "ShopifyUploadHistory", id },
        "ShopifyUploadHistory",
      ],
    }),
  }),
});

export const {
  useUploadMultipleCsvMutation,
  useGetShopifyUploadHistoryQuery,
  useGetShopifyUploadHistoryByIdQuery,
  useLazyGetShopifyUploadHistoryByIdQuery,
} = shopifyApi;
