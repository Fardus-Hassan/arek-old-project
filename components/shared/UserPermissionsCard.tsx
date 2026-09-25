"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserPermissionsEditor } from "@/components/shared/UserPermissionsEditor";
import { useUpdateUserMutation } from "@/lib/api/adminApi";
import { userApi } from "@/lib/api/userApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { useAppDispatch } from "@/lib/hooks";
import { ROLE_SUPERADMIN } from "@/lib/auth-constants";
import { getUserRole } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import {
  permissionsFromUser,
  type UserPermissionFields,
  type UserPermissionsPayload,
} from "@/lib/user-permissions";

type UserPermissionsCardProps = {
  userId: string;
  user: UserPermissionFields | null | undefined;
  /** Own profile: refresh /users/me after save; role is not editable. */
  isSelf?: boolean;
  className?: string;
};

export function UserPermissionsCard({
  userId,
  user,
  isSelf = false,
  className,
}: UserPermissionsCardProps) {
  const dispatch = useAppDispatch();
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UserPermissionsPayload>(() =>
    permissionsFromUser(user),
  );
  const currentRole = String(user?.role ?? "").toUpperCase();
  const [role, setRole] = useState<"USER" | "ADMIN">(
    currentRole === "ADMIN" ? "ADMIN" : "USER",
  );
  const canEditRole = !isSelf && currentRole !== "SUPERADMIN";
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  useEffect(() => {
    setViewerRole(getUserRole());
  }, []);
  const canEdit =
    isSelf || currentRole !== "SUPERADMIN" || viewerRole === ROLE_SUPERADMIN;

  useEffect(() => {
    if (isEditing) return;
    setDraft(permissionsFromUser(user));
    setRole(currentRole === "ADMIN" ? "ADMIN" : "USER");
  }, [user, isEditing, currentRole]);

  const handleSave = async () => {
    try {
      const res = await updateUser({
        id: userId,
        body: {
          ...draft,
          ...(canEditRole ? { role } : {}),
        },
      }).unwrap();
      toast.success(res.message || "Permissions updated");
      setIsEditing(false);
      if (isSelf) dispatch(userApi.util.invalidateTags(["User"]));
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  return (
    <div
      className={cn(
        "bg-white/70 p-6 rounded-lg border border-gray-100 shadow-sm",
        className,
      )}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-[#A825C7]" />
            Feature permissions
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isSelf
              ? "Your defaults on the Home page. Granted features start selected."
              : "Controls which AI features this person can use and what starts selected."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!canEdit ? null : !isEditing ? (
            <Button
              type="button"
              variant="outline"
              className="border-[#A655F6] text-[#A655F6] hover:bg-[#A655F6]/10"
              onClick={() => setIsEditing(true)}>
              Edit permissions
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#A655F6] hover:bg-[#9344E0] text-white"
                disabled={isLoading}
                onClick={() => void handleSave()}>
                {isLoading ? "Saving…" : "Save permissions"}
              </Button>
            </>
          )}
        </div>
      </div>

      {canEditRole ? (
        <div className="mb-5 space-y-2">
          <Label className="text-gray-700 font-medium">Role</Label>
          <div className="flex gap-2 sm:max-w-xs">
            {(["USER", "ADMIN"] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={!isEditing}
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                  role === r
                    ? "border-[#A825C7] bg-[#F9F1FB] text-[#A825C7]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-purple-200",
                  !isEditing && "cursor-not-allowed opacity-60",
                )}>
                {r === "USER" ? "User" : "Admin"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <UserPermissionsEditor
        value={draft}
        onChange={setDraft}
        disabled={!isEditing}
      />
    </div>
  );
}
