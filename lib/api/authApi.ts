import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getAccessToken } from "@/lib/auth-session";
import type { ApiEnvelope } from "./types";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ajpropl-server.vercel.app/api/v1";

export type { ApiEnvelope };

type LoginData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  image: string | null;
  status: string;
  accessToken: string;
};

type ForgotPasswordData = {
  id: string;
  otpSent: boolean;
  message: string;
  type: string;
};

type VerifyOtpData = {
  accessToken: string;
};

type ResetPasswordResultData = {
  message: string;
};

type AddAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "ADMIN";
};

type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      if (typeof window !== "undefined") {
        const token = getAccessToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<ApiEnvelope<LoginData>, { email: string; password: string }>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<ApiEnvelope<ForgotPasswordData>, { email: string }>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    verifyResetPasswordOtp: builder.mutation<
      ApiEnvelope<VerifyOtpData>,
      { userId: string; otpCode: string }
    >({
      query: (body) => ({
        url: "/auth/verify-reset-password-otp",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<
      ApiEnvelope<ResetPasswordResultData>,
      { token: string; newPassword: string; confirmPassword: string }
    >({
      query: ({ token, newPassword, confirmPassword }) => ({
        url: "/auth/reset-password",
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { newPassword, confirmPassword },
      }),
    }),
    addAdmin: builder.mutation<ApiEnvelope<{ id: string }>, AddAdminPayload>({
      query: (body) => ({
        url: "/auth/add-admin",
        method: "POST",
        body,
      }),
    }),
    changePassword: builder.mutation<
      ApiEnvelope<ResetPasswordResultData>,
      ChangePasswordPayload
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useVerifyResetPasswordOtpMutation,
  useResetPasswordMutation,
  useAddAdminMutation,
  useChangePasswordMutation,
} = authApi;

export function getRtkQueryErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as FetchBaseQueryError).data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
  }
  if (typeof error === "object" && error !== null && "error" in error) {
    const e = error as { error?: string };
    if (typeof e.error === "string") return e.error;
  }
  return "Something went wrong";
}
