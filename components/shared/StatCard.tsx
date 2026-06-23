"use client";

import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
}

const StatCard = ({ value, label, icon: Icon }: StatCardProps) => {
  return (
    <Card className="p-4 sm:p-6 flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate">
          {value}
        </h3>
        <div className="bg-[#F7F7F7] p-3 rounded-lg mt-4 sm:mt-0">
          <Icon className="h-6 w-6 text-[#00244A]" />
        </div>
      </div>
      <p className="text-sm sm:text-base md:text-lg font-medium text-[#61758A] leading-tight mt-2 sm:mt-0 text-left w-full">
        {label}
      </p>
    </Card>
  );
};

export default StatCard;
