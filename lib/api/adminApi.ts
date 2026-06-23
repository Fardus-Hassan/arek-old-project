import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";



//http://187.124.176.94:5555/api/v1

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://187.124.176.94:5555/api/v1";

export type AdminRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
};

type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPage?: number;
  totalPages?: number;
};

type AdminListResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  meta: PaginatedMeta;
  data: AdminRow[];
};

export type SingleAdminData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  location: string | null;
  phone: string | null;
  createdAt: string;
  totalCreatedProducts: number;
  totalGeneratedProducts: number;
  generatedImages: Array<{
    id: string;
    product_title: string | null;
    product_category: string | null;
    isModel: boolean;
    isMannequin: boolean;
    isImageDiagram: boolean;
    dateFormat: string;
  }>;
};

export type SocialMediaPayload = {
  fbLink: string;
  twitterLink: string;
  instaLink: string;
};

export type SocialMediaData = SocialMediaPayload & {
  id: string;
};

export type RecentActivityItem = {
  id: string;
  product_title: string | null;
  product_category: string | null;
  isModel: boolean;
  isMannequin: boolean;
  isImageDiagram: boolean;
  dateFormat: string;
};

export type DashboardOverviewData = {
  totalProducts: number;
  totalGeneratedImages: number;
  totalGeneratedDocuments: number;
  averageTimeSaved: number;
  weeklyDocumentsChart: Array<{ day: string; count: number }>;
};

export const adminApi = createApi({
  reducerPath: "adminApi",
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
  tagTypes: ["Admin", "Social", "Recent", "Overview"],
  endpoints: (builder) => ({
    getAllAdmins: builder.query<
      AdminListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/admin/all-admin",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["Admin"],
    }),
    getSingleAdmin: builder.query<ApiEnvelope<SingleAdminData>, string>({
      query: (id) => ({ url: `/admin/single-admin/${id}`, method: "GET" }),
      providesTags: ["Admin"],
    }),
    removeAdmin: builder.mutation<ApiEnvelope<{ id: string }>, string>({
      query: (id) => ({ url: `/admin/remove-admin/${id}`, method: "DELETE" }),
      invalidatesTags: ["Admin"],
    }),
    getSocialMedia: builder.query<ApiEnvelope<SocialMediaData>, void>({
      query: () => ({ url: "/admin/get-social-media", method: "GET" }),
      providesTags: ["Social"],
    }),
    addSocialMedia: builder.mutation<
      ApiEnvelope<SocialMediaData>,
      SocialMediaPayload
    >({
      query: (body) => ({ url: "/admin/add-social-media", method: "POST", body }),
      invalidatesTags: ["Social"],
    }),
    updateSocialMedia: builder.mutation<
      ApiEnvelope<SocialMediaData>,
      { id: string; body: Partial<SocialMediaPayload> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/update-social-media/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Social"],
    }),
    getRecentActivity: builder.query<
      ApiEnvelope<RecentActivityItem[]> & { meta?: PaginatedMeta },
      { search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: "/admin/recent-activity",
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["Recent"],
    }),
    getDashboardOverview: builder.query<ApiEnvelope<DashboardOverviewData>, void>({
      query: () => ({ url: "/admin/admin-dashboard-overview", method: "GET" }),
      providesTags: ["Overview"],
    }),
  }),
});

export const {
  useGetAllAdminsQuery,
  useGetSingleAdminQuery,
  useRemoveAdminMutation,
  useGetSocialMediaQuery,
  useAddSocialMediaMutation,
  useUpdateSocialMediaMutation,
  useGetRecentActivityQuery,
  useGetDashboardOverviewQuery,
} = adminApi;
