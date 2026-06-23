"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddSocialMediaMutation,
  useGetSocialMediaQuery,
  useUpdateSocialMediaMutation,
} from "@/lib/api/adminApi";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";

type SocialForm = {
  facebook: string;
  x: string;
  instagram: string;
};

export default function SocialMediaLinks() {
  const { data, isLoading: isSocialLoading } = useGetSocialMediaQuery();
  const [addSocial, { isLoading: isAdding }] = useAddSocialMediaMutation();
  const [updateSocial, { isLoading: isUpdating }] =
    useUpdateSocialMediaMutation();

  const socialForm = useForm<SocialForm>({
    defaultValues: {
      facebook: "",
      x: "",
      instagram: "",
    },
  });

  useEffect(() => {
    if (!data?.data) return;
    socialForm.reset({
      facebook: data.data.fbLink ?? "",
      x: data.data.twitterLink ?? "",
      instagram: data.data.instaLink ?? "",
    });
  }, [data, socialForm]);

  const onSocialSubmit = async (values: SocialForm) => {
    const payload = {
      fbLink: values.facebook.trim(),
      twitterLink: values.x.trim(),
      instaLink: values.instagram.trim(),
    };
    try {
      if (data?.data?.id) {
        const res = await updateSocial({
          id: data.data.id,
          body: payload,
        }).unwrap();
        toast.success(res.message || "Social media updated");
      } else {
        const res = await addSocial(payload).unwrap();
        toast.success(res.message || "Social media saved");
      }
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const isSaving = isAdding || isUpdating;

  return (
    <div className="bg-white/70 p-6 rounded-lg border border-gray-100 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-6">
        Platform Social Media Info:
      </h2>
      {isSocialLoading && (
        <div className="space-y-3 mb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      <form onSubmit={socialForm.handleSubmit(onSocialSubmit)} className="">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <Label className="mb-2 block">Facebook</Label>
            <Input
              {...socialForm.register("facebook")}
              placeholder="Facebook"
              disabled={isSocialLoading}
              className="bg-transparent"
            />
          </div>
          <div>
            <Label className="mb-2 block">X</Label>
            <Input
              {...socialForm.register("x")}
              placeholder="X"
              disabled={isSocialLoading}
              className="bg-transparent"
            />
          </div>
          <div>
            <Label className="mb-2 block">Instagram</Label>
            <Input
              {...socialForm.register("instagram")}
              placeholder="Instagram"
              disabled={isSocialLoading}
              className="bg-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button
            type="button"
            variant="outline"
            className="px-6"
            disabled={isSocialLoading || isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSocialLoading || isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
