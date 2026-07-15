import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.aisizepro.com/api/v1";

export type TimeZoneOption = {
  label: string;
  value: string;
};

export type AppTimeZone = {
  id: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
};

function clientIdParams(): Record<string, string> | undefined {
  const id = process.env.NEXT_PUBLIC_CLIENT_ID?.trim();
  return id ? { client_id: id } : undefined;
}

export const timeZoneApi = createApi({
  reducerPath: "timeZoneApi",
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
  tagTypes: ["AppTimeZone"],
  endpoints: (builder) => ({
    getTimeZoneList: builder.query<ApiEnvelope<TimeZoneOption[]>, void>({
      query: () => ({
        url: "/time-zone/time-zone-lists",
        method: "GET",
        params: clientIdParams(),
      }),
    }),
    getAppTimezone: builder.query<ApiEnvelope<AppTimeZone>, void>({
      query: () => ({
        url: "/time-zone/",
        method: "GET",
        params: clientIdParams(),
      }),
      providesTags: ["AppTimeZone"],
    }),
    updateAppTimezone: builder.mutation<
      ApiEnvelope<AppTimeZone>,
      { timezone: string }
    >({
      query: (body) => ({
        url: "/time-zone/",
        method: "PATCH",
        body,
        params: clientIdParams(),
      }),
      invalidatesTags: ["AppTimeZone"],
    }),
  }),
});

export const {
  useGetTimeZoneListQuery,
  useGetAppTimezoneQuery,
  useUpdateAppTimezoneMutation,
} = timeZoneApi;
