import { useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomPagination from "@/components/shared/CustomPagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetRecentActivityQuery,
  useGetSingleAdminQuery,
} from "@/lib/api/adminApi";

export default function RecentActivity() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { data: singleData } = useGetSingleAdminQuery(adminId ?? "", {
    skip: !adminId,
  });
  const { data: listData, isLoading } = useGetRecentActivityQuery(
    { page: currentPage, limit: itemsPerPage },
    { skip: !!adminId },
  );

  const singleActivities = singleData?.data.generatedImages ?? [];
  const listActivities = listData?.data ?? [];
  const pagedSingleActivities = singleActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const currentActivities = adminId ? pagedSingleActivities : listActivities;

  const totalItems = adminId
    ? singleActivities.length
    : (listData?.meta?.total ?? 0);
  const totalPages =
    adminId
      ? Math.max(1, Math.ceil(singleActivities.length / itemsPerPage))
      : (listData?.meta?.totalPage ?? 1);

  // For handlePageChange function
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  // For handleItemsPerPageChange function
  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <div className="mt-12">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">
        Admin Profile
      </h1>

      {/* Desktop Table View - Hidden on mobile and tablets */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="border-b-0 hover:bg-[#eff1f4]">
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Date</TableHead>
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Image Title</TableHead>
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Category</TableHead>
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Model</TableHead>
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Mannequin</TableHead>
                <TableHead className="py-4 text-[#4A5565] font-medium text-center text-xl">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`recent-skeleton-${i}`}>
                    <TableCell className="py-5"><Skeleton className="h-4 w-28 mx-auto" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-40 mx-auto" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-28 mx-auto" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              )}
              {currentActivities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="hover:bg-gray-50 border-gray-100">
                  <TableCell className="py-5 font-medium text-gray-700 text-center text-base">
                    {activity.dateFormat}
                  </TableCell>
                  <TableCell className="py-5 text-[#1C1C1C] text-center text-base">
                    {activity.product_title ?? "N/A"}
                  </TableCell>
                  <TableCell className="py-5 text-[#1C1C1C] text-center text-base">
                    {activity.product_category ?? "N/A"}
                  </TableCell>
                  <TableCell className="py-5 text-[#1C1C1C] text-center text-base">
                    {activity.isModel ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="py-5 text-[#1C1C1C] text-center text-base">
                    {activity.isMannequin ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="py-5 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-600">
                      {activity.isImageDiagram ? "Diagram" : "Generated"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile & Tablet Card View - Shown on screens smaller than lg */}
      <div className="md:hidden space-y-4">
        {currentActivities.map((activity) => (
          <div
            key={activity.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base">
                  {activity.dateFormat}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Title:</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {activity.product_title ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Model:</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {activity.isModel ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600 ml-2 shrink-0">
                {activity.isMannequin ? "Mannequin" : "Standard"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Logged In</span>
                <p className="text-sm text-gray-700 font-medium">
                  {activity.product_category ?? "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Logged Out</span>
                <p className="text-sm text-gray-700 font-medium">
                  {activity.isImageDiagram ? "Diagram" : "Generated"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Component */}
      <div className="mt-6">
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </div>
  );
}
