import React from "react";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export default function AuthButton({
  children,
  className,
  ...props
}: AuthButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "w-full bg-primary hover:opacity-95 text-white py-1.5 sm:py-2 rounded-md sm:rounded-lg text-sm sm:text-base font-semibold transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className,
      )}
    >
      {children}
    </button>
  );
}
