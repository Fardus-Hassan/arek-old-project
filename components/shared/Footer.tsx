import React from "react";
import Logo from "./Logo";
import Link from "next/link";
import { Facebook, Instagram, X } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white py-14 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Logo Section */}
        <div className="mb-8">
          <Logo />
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
          {/* Social Icons */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              target="_blank"
              className="transition-transform hover:scale-110"
            >
              <Facebook
                size={26}
                className="text-[#1877F2] fill-[#1877F2] stroke-none"
              />
            </Link>
            <Link
              href="/about"
              target="_blank"
              className="transition-transform hover:scale-110"
            >
              <X size={22} className="text-black" />
            </Link>
            <Link
              href="/contact"
              target="_blank"
              className="transition-transform hover:scale-110"
            >
              <Instagram size={26} className="text-[#FF0073]" />
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-[#1A1A1A] font-medium text-[15px] flex items-center gap-1">
            <span>©</span>
            <span>2025 - All rights Researved<span title="Developed by Fardus (fardus.dev@gmail.com)">.</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
