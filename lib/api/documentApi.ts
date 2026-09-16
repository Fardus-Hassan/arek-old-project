import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

type Meta = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPage?: number;
  totalPages?: number;
};

export type DocumentListItem = {
  id: string;
  product_title: string | null;
  product_category: string | null;
  isModel: boolean;
  isMannequin: boolean;
  isImageDiagram: boolean;
  /** Whether this document was uploaded to Shopify */
  isShopifyUploaded?: boolean;
  dateFormat: string;
};

export type SingleDocument = {
  id: string;
  userId: string;
  aiGenerated: unknown;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Flat product from GET /documents/product/:id */
export type AiProductRecord = {
  id: string;
  seller_id?: string;
  language?: string;
  status?: string;
  is_multi_image?: boolean;
  images_batch?: unknown[];
  created_at?: string;
  updated_at?: string;
  ready_to_publish?: boolean;
  [key: string]: unknown;
};

/** POST /documents/upload-product-to-ai `data` */
export type UploadProductToAiResponseData = {
  /** Job / upload id — use this for GET /documents/product/:id */
  id: string;
  status?: string;
  userId?: string;
  /** Related product uuid (not used for poll path) */
  productId?: string;
  product?: number;
  generatedImages?: number;
  totalSavedTimes?: number;
  customFields?: AiProductRecord;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

/** POST /documents `data` — nested shape from newer API. */
export type CreateDocumentResponseData =
  | SingleDocument
  | {
      document: SingleDocument;
      generatedImageId: string[];
    }
  | UploadProductToAiResponseData;

export const documentApi = createApi({
  reducerPath: "documentApi",
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
  tagTypes: ["Documents", "AiProduct"],
  endpoints: (builder) => ({
    getDocuments: builder.query<
      {
        success: boolean;
        statusCode: number;
        message: string;
        data: DocumentListItem[];
        meta: Meta;
      },
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => ({ url: "/documents", method: "GET", params }),
      providesTags: ["Documents"],
    }),
    getDocumentById: builder.query<ApiEnvelope<SingleDocument>, string>({
      query: (id) => ({ url: `/documents/${id}`, method: "GET" }),
      providesTags: ["Documents"],
    }),

    /**
     * GET /documents/product/:id
     * Poll until status is completed (or failed).
     */
    getProductById: builder.query<ApiEnvelope<AiProductRecord>, string>({
      query: (id) => ({
        url: `/documents/product/${id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, id) => [{ type: "AiProduct", id }],
    }),

    deleteDocument: builder.mutation<ApiEnvelope<SingleDocument>, string>({
      query: (id) => ({ url: `/documents/${id}`, method: "DELETE" }),
      invalidatesTags: ["Documents"],
    }),

    /**
     * POST /documents/upload-product-to-ai
     * form-data: images, backpart_images, clothing_tags, bodyData
     */
    uploadProductToAi: builder.mutation<
      ApiEnvelope<UploadProductToAiResponseData>,
      {
        images: File[];
        backpartImages: File[];
        clothingTags: File[];
        bodyData: string;
      }
    >({
      query: ({ images, backpartImages, clothingTags, bodyData }) => {
        const formData = new FormData();
        images.forEach((image) => formData.append("images", image));
        backpartImages.forEach((image) =>
          formData.append("backpart_images", image),
        );
        clothingTags.forEach((image) =>
          formData.append("clothing_tags", image),
        );
        formData.append("bodyData", bodyData);
        return {
          url: "/documents/upload-product-to-ai",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Documents", "AiProduct"],
    }),

    /** @deprecated Prefer uploadProductToAi */
    createDocument: builder.mutation<
      ApiEnvelope<CreateDocumentResponseData>,
      { images: File[]; backpartImages: File[]; bodyData: string }
    >({
      query: ({ images, backpartImages, bodyData }) => {
        const formData = new FormData();
        images.forEach((image) => formData.append("images", image));
        backpartImages.forEach((image) =>
          formData.append("backpart_images", image),
        );
        formData.append("bodyData", bodyData);
        return { url: "/documents", method: "POST", body: formData };
      },
      invalidatesTags: ["Documents"],
    }),
    updateDocument: builder.mutation<
      ApiEnvelope<CreateDocumentResponseData>,
      {
        /** Row id: `generatedImageId[tabIndex]` from create response — `PATCH /documents/:id`. */
        id: string;
        body: { imageDetails: unknown };
      }
    >({
      query: ({ id, body }) => ({
        url: `/documents/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Documents"],
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useLazyGetDocumentByIdQuery,
  useGetProductByIdQuery,
  useLazyGetProductByIdQuery,
  useDeleteDocumentMutation,
  useUploadProductToAiMutation,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
} = documentApi;
