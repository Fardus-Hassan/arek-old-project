"use client";

import Image from "next/image";
import Link from "next/link";

export default function DashboardLogo() {
  return (
    <Link href={"/"} className="flex items-center gap-2">
      <Image
        className="w-[36px] sm:w-[42px] h-[36px] sm:h-[42px]"
        src={"/images/company-icon.svg"}
        alt="company-logo"
        width={42}
        height={42}
        priority
      />
      <h1 className="text-primary font-bold text-xl sm:text-2xl">Resale AI</h1>
    </Link>
  );
}
