"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  onItemsPerPageChange?: (items: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
}) => {
  const pageNumbers = [];
  const maxPagesToShow = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 w-full">
      {/* Left Side: Showing X out of Y */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Showing</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(value) =>
            onItemsPerPageChange && onItemsPerPageChange(Number(value))
          }
        >
          <SelectTrigger className="w-[70px] h-8 bg-white border-gray-200">
            <SelectValue placeholder={String(itemsPerPage)} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>out of {totalItems.toLocaleString()}</span>
      </div>

      {/* Right Side: Pagination Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900 font-normal pl-0"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>

        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 w-8 p-0 font-normal ${
                currentPage === 1
                  ? "bg-[#A655F6] text-white hover:bg-[#9344E0] hover:text-white border-[#A655F6]"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}

        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant="outline"
            size="sm"
            className={`h-8 w-8 p-0 font-normal ${
              page === currentPage
                ? "bg-[#A655F6] text-white hover:bg-[#9344E0] hover:text-white border-[#A655F6]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-1 text-gray-400">...</span>
            )}
            <Button
              variant="outline"
              size="sm"
              className={`h-8 w-8 p-0 font-normal ${
                currentPage === totalPages
                  ? "bg-[#A655F6] text-white hover:bg-[#9344E0] hover:text-white border-[#A655F6]"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900 font-normal pr-0"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
        
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default CustomPagination;
