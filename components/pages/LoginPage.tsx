"use client";

import React, { useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Logo from "../shared/Logo";
import AuthButton from "../shared/AuthButton";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  LoginValues,
  ForgotPasswordValues,
  ResetPasswordValues,
  AuthStep,
} from "@/types/loginType";
import {
  useLoginMutation,
  useForgotPasswordMutation,
  useVerifyResetPasswordOtpMutation,
  useResetPasswordMutation,
  getRtkQueryErrorMessage,
} from "@/lib/api/authApi";
import { LANDING_PATH } from "@/lib/auth-constants";
import { persistAuthSession } from "@/lib/auth-session";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotUserId, setForgotUserId] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtpToken, setResetOtpToken] = useState<string | null>(null);

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [forgotPassword, { isLoading: isForgotLoading }] =
    useForgotPasswordMutation();
  const [verifyOtp, { isLoading: isVerifyLoading }] =
    useVerifyResetPasswordOtpMutation();
  const [resetPassword, { isLoading: isResetLoading }] =
    useResetPasswordMutation();

  // --- LOGIN FORM ---
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLoginSubmit = async (data: LoginValues) => {
    try {
      const res = await login(data).unwrap();
      persistAuthSession(res.data.accessToken, res.data.role);
      toast.success(res.message);
      window.location.href = LANDING_PATH;
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  // --- FORGOT PASSWORD FORM ---
  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onForgotPasswordSubmit = async (data: ForgotPasswordValues) => {
    try {
      const res = await forgotPassword({ email: data.email }).unwrap();
      setForgotUserId(res.data.id);
      setForgotEmail(data.email);
      toast.success(res.message);
      setStep("verification");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const onResendOtp = async () => {
    if (!forgotEmail) return;
    try {
      const res = await forgotPassword({ email: forgotEmail }).unwrap();
      setForgotUserId(res.data.id);
      toast.success(res.message);
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  // --- RESET PASSWORD FORM ---
  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  const onResetPasswordSubmit = async ({
    newPassword,
    confirmPassword,
  }: ResetPasswordValues) => {
    if (!resetOtpToken) {
      toast.error("Session expired. Please start over.");
      setStep("login");
      return;
    }
    try {
      const res = await resetPassword({
        token: resetOtpToken,
        newPassword,
        confirmPassword,
      }).unwrap();
      toast.success(res.message);
      setResetOtpToken(null);
      setForgotUserId(null);
      resetPasswordForm.reset();
      setStep("login");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  // --- VERIFICATION CODE LOGIC ---
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const codeValue = useWatch({
    control: resetPasswordForm.control,
    name: "code",
  }) ?? "";

  const onVerifyContinue = async () => {
    if (codeValue.length !== 6 || !forgotUserId) {
      toast.error("Enter the 6-digit code");
      return;
    }
    try {
      const res = await verifyOtp({
        userId: forgotUserId,
        otpCode: codeValue,
      }).unwrap();
      setResetOtpToken(res.data.accessToken);
      toast.success(res.message);
      setStep("reset-password");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const currentCode = codeValue.split("");
    currentCode[index] = value.slice(-1);
    const newCode = currentCode.join("");

    resetPasswordForm.setValue("code", newCode, { shouldValidate: true });

    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !codeValue[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .slice(0, 6)
      .replace(/\D/g, "");
    resetPasswordForm.setValue("code", pastedData, { shouldValidate: true });

    const lastIndex = Math.min(pastedData.length, 5);
    codeInputs.current[lastIndex]?.focus();
  };

  const renderCurrentStep = () => {
    switch (step) {
      case "login":
        return (
          <div className="space-y-6 sm:space-y-8">
            <Logo />
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-xl xl:text-3xl font-semibold text-gray-900 tracking-tight">
                Admin Login
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-xs xl:text-base leading-relaxed">
                Admin access only. All actions are logged for security.
              </p>
            </div>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-5 sm:space-y-6 lg:space-y-4 xl:space-y-6"
            >
              <div className="space-y-1.5 sm:space-y-2 lg:space-y-1.5">
                <label className="text-[0.75rem] sm:text-[0.85rem] lg:text-[0.7rem] xl:text-[0.85rem] font-medium text-gray-700 block ml-0.5 sm:ml-1">
                  Email
                </label>
                <input
                  {...loginForm.register("email")}
                  type="email"
                  placeholder="Enter your admin email address"
                  className="w-full border border-gray-100 rounded-md sm:rounded-lg px-4 py-2 sm:py-2.5 lg:py-2 xl:py-2.5 text-sm sm:text-base lg:text-sm xl:text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-red-500 ml-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2 relative">
                <label className="text-[0.75rem] sm:text-[0.85rem] lg:text-[0.7rem] xl:text-[0.85rem] font-medium text-gray-700 block ml-0.5 sm:ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...loginForm.register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full border border-gray-100 rounded-md sm:rounded-lg px-4 py-2 sm:py-2.5 lg:py-2 xl:py-2.5 text-sm sm:text-base lg:text-sm xl:text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={18} className="sm:size-5" />
                    ) : (
                      <Eye size={18} className="sm:size-5" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-red-500 ml-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep("forgot-password")}
                  className="text-[0.7rem] sm:text-[0.8rem] text-red-400 hover:text-red-500 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="flex justify-center">
                <AuthButton
                  type="submit"
                  className="w-full"
                  disabled={isLoginLoading}
                >
                  {isLoginLoading ? "Signing in…" : "Log In"}
                </AuthButton>
              </div>
            </form>
          </div>
        );

      case "forgot-password":
        return (
          <div className="space-y-6 sm:space-y-8 lg:space-y-6 xl:space-y-8">
            <Logo />
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-xl xl:text-3xl font-semibold text-gray-900 tracking-tight">
                Forgot your admin password?
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-xs xl:text-base leading-relaxed">
                Enter your email and we&apos;ll send you a 6-digit code
              </p>
            </div>
            <form
              onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
              className="space-y-5 sm:space-y-6 lg:space-y-4 xl:space-y-6"
            >
              <div className="space-y-1.5 sm:space-y-2 lg:space-y-1.5">
                <label className="text-[0.75rem] sm:text-[0.85rem] lg:text-[0.7rem] xl:text-[0.85rem] font-medium text-gray-700 block ml-0.5 sm:ml-1">
                  Email
                </label>
                <input
                  {...forgotPasswordForm.register("email")}
                  type="email"
                  placeholder="Enter your admin email address"
                  className="w-full border border-gray-100 rounded-md sm:rounded-lg px-4 py-2 sm:py-2.5 lg:py-2 xl:py-2.5 text-sm sm:text-base lg:text-sm xl:text-base text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-xs text-red-500 ml-1">
                    {forgotPasswordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-sm sm:text-base font-semibold transition-all"
                >
                  Back
                </button>
                <AuthButton
                  type="submit"
                  className="flex-1"
                  disabled={isForgotLoading}
                >
                  {isForgotLoading ? "Sending…" : "Send Email"}
                </AuthButton>
              </div>
            </form>
          </div>
        );

      case "verification":
        return (
          <div className="space-y-6 sm:space-y-8 lg:space-y-6 xl:space-y-8">
            <Logo />
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-xl xl:text-3xl font-semibold text-gray-900 tracking-tight">
                Reset password
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-xs xl:text-base leading-relaxed">
                Enter the 6-digit code sent to your email
              </p>
            </div>
            <div className="space-y-6 lg:space-y-4 xl:space-y-6">
              <div className="space-y-2 lg:space-y-1.5">
                <label className="text-[0.75rem] sm:text-[0.85rem] lg:text-[0.7rem] xl:text-[0.85rem] font-medium text-gray-700 block">
                  Verification Code
                </label>
                <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeInputs.current[i] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={codeValue[i] || ""}
                      className="w-full h-10 sm:h-12 lg:h-10 xl:h-12 border border-gray-200 rounded-md sm:rounded-lg text-center text-lg sm:text-xl lg:text-lg xl:text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                    />
                  ))}
                </div>
                {resetPasswordForm.formState.errors.code && (
                  <p className="text-xs text-red-500 mt-1">
                    {resetPasswordForm.formState.errors.code.message}
                  </p>
                )}
                <div className="mt-2 text-[0.7rem] sm:text-[0.8rem]">
                  <span className="text-gray-400">Didn&apos;t get it? </span>
                  <button
                    type="button"
                    onClick={onResendOtp}
                    disabled={isForgotLoading || !forgotEmail}
                    className="text-red-400 hover:text-red-500 font-medium disabled:opacity-50"
                  >
                    Resend
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep("forgot-password")}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-sm sm:text-base font-semibold transition-all"
                >
                  Back
                </button>
                <AuthButton
                  type="button"
                  onClick={onVerifyContinue}
                  className="flex-1"
                  disabled={
                    isVerifyLoading ||
                    codeValue.length !== 6 ||
                    !forgotUserId
                  }
                >
                  {isVerifyLoading ? "Verifying…" : "Continue"}
                </AuthButton>
              </div>
            </div>
          </div>
        );

      case "reset-password":
        return (
          <div className="space-y-6 sm:space-y-8 lg:space-y-6 xl:space-y-8">
            <Logo />
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-xl xl:text-3xl font-semibold text-gray-900 tracking-tight">
                Reset Password
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-xs xl:text-base leading-relaxed">
                Please enter your new password below. Make sure it&apos;s strong
                and secure
              </p>
            </div>
            <form
              onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}
              className="space-y-5 sm:space-y-6 lg:space-y-4 xl:space-y-6"
            >
              <div className="space-y-1.5 sm:space-y-2 lg:space-y-1.5 relative">
                <label className="text-[0.75rem] sm:text-[0.85rem] lg:text-[0.7rem] xl:text-[0.85rem] font-medium text-gray-700 block">
                  New Password (Min. 8 characters)
                </label>
                <div className="relative">
                  <input
                    {...resetPasswordForm.register("newPassword")}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    className="w-full border border-gray-100 rounded-md sm:rounded-lg px-4 py-2 sm:py-2.5 lg:py-2 xl:py-2.5 text-sm sm:text-base lg:text-sm xl:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {resetPasswordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500 ml-1">
                    {resetPasswordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2 relative">
                <label className="text-[0.75rem] sm:text-[0.85rem] font-medium text-gray-700 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...resetPasswordForm.register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="w-full border border-gray-100 rounded-md sm:rounded-lg px-4 py-2 sm:py-2.5 lg:py-2 xl:py-2.5 text-sm sm:text-base lg:text-sm xl:text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {resetPasswordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">
                    {resetPasswordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep("verification")}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-sm sm:text-base font-semibold transition-all"
                >
                  Back
                </button>
                <AuthButton
                  type="submit"
                  className="flex-1"
                  disabled={isResetLoading}
                >
                  {isResetLoading ? "Saving…" : "Confirm"}
                </AuthButton>
              </div>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl p-6 sm:p-10 md:p-12 lg:p-8 xl:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full font-sans transition-all duration-300">
      {renderCurrentStep()}
    </div>
  );
}
