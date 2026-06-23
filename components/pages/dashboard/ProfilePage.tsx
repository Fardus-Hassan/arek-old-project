"use client";

import * as React from "react";
import ChangePassword from "@/components/features/dashboard/profile/ChangePassword";
import ProfileDetails from "@/components/features/dashboard/profile/ProfileDetails";
import SocialMediaLinks from "@/components/features/dashboard/profile/SocialMediaLinks";
import { ROLE_SUPERADMIN } from "@/lib/auth-constants";
import { getUserRole } from "@/lib/auth-session";

const ProfilePage = () => {
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRole(getUserRole());
  }, []);

  const isSuperAdmin = role === ROLE_SUPERADMIN;

  return (
    <div className="">
      <div className="w-full overflow-hidden">
        <h1 className="text-3xl font-bold text-gray-900 pb-4 mb-8">
          Admin Profile
        </h1>

        <div className="space-y-8">
          <ProfileDetails />
          {isSuperAdmin ? <SocialMediaLinks /> : null}
          <ChangePassword />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
