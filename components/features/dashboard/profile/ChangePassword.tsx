"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordMutation, getRtkQueryErrorMessage } from "@/lib/api/authApi";

const passwordSchema = z.object({
  oldPassword: z.string().min(6, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePassword() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      const res = await changePassword(data).unwrap();
      toast.success(res.message || "Password changed successfully");
      passwordForm.reset({
        oldPassword: "",
        newPassword: "",
      });
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  return (
    <div className="bg-white/70 p-6 rounded-lg border border-gray-100 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-6">
        Change Password
      </h2>

      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label className="mb-2 block">Old Password</Label>
            <div className="relative">
              <Input
                type={showOldPassword ? "text" : "password"}
                {...passwordForm.register("oldPassword")}
                placeholder="Old Password"
                className="bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                {...passwordForm.register("newPassword")}
                placeholder="New Password"
                className="bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button type="button" variant="outline" className="px-6">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
