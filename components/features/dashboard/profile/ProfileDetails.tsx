"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetMeQuery,
  useUpdateProfileImageMutation,
  useUpdateProfileMutation,
} from "@/lib/api/userApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { DEFAULT_PROFILE_AVATAR, getProfileImageUrl } from "@/lib/utils";
import { useIsClient } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth-session";

type NameLocationForm = {
  firstName: string;
  lastName: string;
  location: string;
  phone: string;
  email: string;
};

export default function ProfileDetails() {
  const isClient = useIsClient();
  const hasToken = isClient && !!getAccessToken();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, isError, refetch } = useGetMeQuery(undefined, {
    skip: !hasToken,
  });
  const [updateImage, { isLoading: isUploading }] =
    useUpdateProfileImageMutation();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const profile = data?.data;

  const nameForm = useForm<NameLocationForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      location: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    if (!profile || isEditing) return;
    nameForm.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      location: profile.location ?? "",
      phone: profile.phone ?? "",
    });
    // Intentionally omit `nameForm` / full `profile`: unstable refs were firing reset every render and clearing inputs while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync server → form only when these identity fields change
  }, [
    isEditing,
    profile?.id,
    profile?.firstName,
    profile?.lastName,
    profile?.email,
    profile?.location,
    profile?.phone,
    nameForm.reset,
  ]);

  const onPickImage = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await updateImage({ image: file }).unwrap();
      toast.success("Profile photo updated");
      refetch();
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  const cancelEdit = () => {
    if (profile) {
      nameForm.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        location: profile.location ?? "",
        phone: profile.phone ?? "",
      });
    }
    setIsEditing(false);
  };

  const onSaveProfile = nameForm.handleSubmit(async (values) => {
    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        location: values.location,
        phone: values.phone,
      }).unwrap();
      toast.success("Profile updated");
      setIsEditing(false);
      refetch();
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  });

  const imgSrc =
    getProfileImageUrl(profile?.image) ?? DEFAULT_PROFILE_AVATAR;

  if (isLoading && !profile) {
    return (
      <div className="bg-white/70 p-6 rounded-lg border border-gray-100 shadow-sm animate-pulse">
        <div className="h-32 w-32 rounded-full bg-gray-200 mb-8" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (isError && !profile) {
    return (
      <div className="bg-white/70 p-6 rounded-lg border border-gray-100 text-sm text-red-600">
        Could not load profile.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/70 p-6 rounded-lg border border-gray-100 shadow-sm">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <div className="mb-8">
        <Label className="text-base font-semibold text-gray-900 mb-4 block">
          Profile Picture
        </Label>
        <div className="relative group w-fit">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-sm bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover bg-gray-100"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src !== DEFAULT_PROFILE_AVATAR) {
                  el.src = DEFAULT_PROFILE_AVATAR;
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={onPickImage}
            disabled={isUploading}
            className="absolute bottom-1 right-1 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            <Camera size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
        <form className="flex-1 w-full space-y-6" onSubmit={onSaveProfile}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              {isEditing
                ? "Update your details and save."
                : "Edit to change name, location, or phone."}
            </p>
            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#A655F6] text-[#A655F6] hover:bg-[#A655F6]/10"
                  onClick={() => setIsEditing(true)}>
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#A655F6] hover:bg-[#9344E0] text-white"
                    disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">First Name</Label>
              <Input
                {...nameForm.register("firstName")}
                disabled={!isEditing}
                className={isEditing ? "bg-white" : "bg-gray-50"}
              />
            </div>
            <div>
              <Label className="mb-2 block">Last Name</Label>
              <Input
                {...nameForm.register("lastName")}
                disabled={!isEditing}
                className={isEditing ? "bg-white" : "bg-gray-50"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Location</Label>
              <Input
                {...nameForm.register("location")}
                disabled={!isEditing}
                className={isEditing ? "bg-white" : "bg-gray-50"}
              />
            </div>
            <div>
              <Label className="mb-2 block">Phone</Label>
              <Input
                {...nameForm.register("phone")}
                disabled={!isEditing}
                className={isEditing ? "bg-white" : "bg-gray-50"}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Email</Label>
            <Input
              type="email"
              {...nameForm.register("email")}
              disabled
              className="bg-gray-50"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
