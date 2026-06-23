import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://187.124.176.94:5555/api/v1";

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

/** POST /documents `data` — nested shape from newer API. */
export type CreateDocumentResponseData =
  | SingleDocument
  | {
      document: SingleDocument;
      generatedImageId: string[];
    };

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
  tagTypes: ["Documents"],
  endpoints: (builder) => ({
    getDocuments: builder.query<
      { success: boolean; statusCode: number; message: string; data: DocumentListItem[]; meta: Meta },
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => ({ url: "/documents", method: "GET", params }),
      providesTags: ["Documents"],
    }),
    getDocumentById: builder.query<ApiEnvelope<SingleDocument>, string>({
      query: (id) => ({ url: `/documents/${id}`, method: "GET" }),
      providesTags: ["Documents"],
    }),
    deleteDocument: builder.mutation<ApiEnvelope<SingleDocument>, string>({
      query: (id) => ({ url: `/documents/${id}`, method: "DELETE" }),
      invalidatesTags: ["Documents"],
    }),
    createDocument: builder.mutation<
      ApiEnvelope<CreateDocumentResponseData>,
      { images: File[]; bodyData: string }
    >({
      query: ({ images, bodyData }) => {
        const formData = new FormData();
        images.forEach((image) => formData.append("images", image));
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
  useDeleteDocumentMutation,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
} = documentApi;
