import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ajpropl-server.vercel.app/api/v1";

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  image: string | null;
  role: string;
};

export const userApi = createApi({
  reducerPath: "userApi",
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
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getMe: builder.query<ApiEnvelope<UserProfile>, void>({
      query: () => ({ url: "/users/me", method: "GET" }),
      providesTags: ["User"],
    }),
    updateProfileImage: builder.mutation<void, { image: File }>({
      query: ({ image }) => {
        const body = new FormData();
        body.append("image", image);
        return {
          url: "/users/profile",
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["User"],
    }),
    updateProfile: builder.mutation<
      ApiEnvelope<UserProfile>,
      { firstName: string; lastName: string; location: string; phone: string }
    >({
      query: ({ firstName, lastName, location, phone }) => {
        const formData = new FormData();
        formData.append(
          "bodyData",
          JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            location: location.trim(),
            phone: phone.trim(),
          }),
        );
        return {
          url: "/users/profile",
          method: "PATCH",
          body: formData,
        };
      },
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateProfileImageMutation,
  useUpdateProfileMutation,
} = userApi;
