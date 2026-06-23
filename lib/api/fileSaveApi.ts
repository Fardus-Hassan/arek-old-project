import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ajpropl-server.vercel.app/api/v1";

export type FileSaveMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SavedFileItem = {
  id: string;
  userId: string;
  title: string;
  fileUrl: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  savedAt: string;
};

export type MySavedFilesResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  meta: FileSaveMeta;
  data: SavedFileItem[];
};

export const fileSaveApi = createApi({
  reducerPath: "fileSaveApi",
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
  tagTypes: ["SavedFiles"],
  endpoints: (builder) => ({
    getMySavedFiles: builder.query<
      MySavedFilesResponse,
      { page?: number; limit?: number }
    >({
      query: (params) => ({ url: "/file-save/my-saved-files", method: "GET", params }),
      providesTags: ["SavedFiles"],
    }),
  }),
});

export const { useGetMySavedFilesQuery } = fileSaveApi;

