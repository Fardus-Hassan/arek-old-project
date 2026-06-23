"use client";

import { useState } from "react";
import {
  BarChart3,
  FileText,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import WeeklyBarChart from "@/components/features/dashboard/WeeklyBarChart";
import { DonutChart } from "@/components/shared/CircularProgress";
import CustomPagination from "@/components/shared/CustomPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useGetDashboardOverviewQuery,
  useGetRecentActivityQuery,
} from "@/lib/api/adminApi";

const Overview = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const { data: overviewData, isLoading: isOverviewLoading } =
    useGetDashboardOverviewQuery();
  const { data: activityData, isLoading: isActivityLoading } =
    useGetRecentActivityQuery({
      page: currentPage,
      limit: itemsPerPage,
      search: searchText || undefined,
    });

  const totalItems = activityData?.meta?.total ?? 0;
  const totalPages =
    activityData?.meta?.totalPage ??
    activityData?.meta?.totalPages ??
    Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const activities = activityData?.data ?? [];
  const overview = overviewData?.data;

  const stats = [
    {
      value: overview?.totalProducts ?? 0,
      label: "Total Products",
      icon: Users,
    },
    {
      value: overview?.totalGeneratedImages ?? 0,
      label: "Total Generated Images",
      icon: BarChart3,
    },
    {
      value: overview?.totalGeneratedDocuments ?? 0,
      label: "Total Documents",
      icon: FileText,
    },
    {
      value: `${overview?.averageTimeSaved ?? 0}`,
      label: "Average Time Saved",
      icon: Sparkles,
    },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Page Title */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
        Overview
      </h1>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(isOverviewLoading ? [] : stats).map((stat, index) => (
          <StatCard
            key={index}
            value={stat.value}
            label={stat.label}
            icon={stat.icon}
          />
        ))}
        {isOverviewLoading && (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="col-span-1 lg:col-span-3">
          <WeeklyBarChart />
        </div>
        {/* <CircularProgress value={4} label="Average Time Saved" /> */}
        <div className="col-span-1 lg:col-span-2">
          <DonutChart
            maxValue={Math.max(1, overview?.totalGeneratedImages ?? 1)}
            value={overview?.totalGeneratedDocuments ?? 0}
          />
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            Recent activity
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Sort By */}
            {/* <Select defaultValue="date" onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] bg-white rounded-full border-gray-200 h-9 sm:h-10">
                <SelectValue placeholder="Sort By Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort By Date</SelectItem>
                <SelectItem value="title">Sort By Title</SelectItem>
                <SelectItem value="type">Sort By Type</SelectItem>
              </SelectContent>
            </Select> */}

            {/* Search */}
            <div className="relative w-full sm:w-[200px] md:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search"
                className="pl-9 bg-white rounded-full border-gray-200 h-9 sm:h-10"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[800px]">
              <TableHeader className="bg-[#eff1f4]">
                <TableRow className="hover:bg-[#eff1f4] border-b-0">
                  <TableHead className="min-w-[180px] text-gray-600 font-medium py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Date & Time
                  </TableHead>
                  <TableHead className="min-w-[140px] text-gray-600 font-medium py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Image Title
                  </TableHead>
                  <TableHead className="min-w-[160px] text-gray-600 font-medium py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Product Type
                  </TableHead>
                  <TableHead className="min-w-[100px] text-gray-600 font-medium text-center py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Model
                  </TableHead>
                  <TableHead className="min-w-[100px] text-gray-600 font-medium text-center py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Mannequin
                  </TableHead>
                  {/* <TableHead className="min-w-[120px] text-right text-gray-600 font-medium py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                    Action
                  </TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isActivityLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`activity-skeleton-${i}`}>
                      <TableCell className="py-3"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell className="py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {activities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="hover:bg-gray-50 border-gray-100">
                    <TableCell className="font-medium text-gray-700 py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {activity.dateFormat}
                    </TableCell>
                    <TableCell className="text-gray-700 py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {activity.product_title ?? "N/A"}
                    </TableCell>
                    <TableCell className="text-gray-700 py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {activity.product_category ?? "N/A"}
                    </TableCell>
                    <TableCell className="text-center text-gray-700 py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {activity.isModel ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-center text-gray-700 py-2 sm:py-3 px-3 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {activity.isMannequin ? "Yes" : "No"}
                    </TableCell>
                    {/* <TableCell className="text-right py-2 sm:py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 shrink-0">
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled
                          className="h-7 w-7 sm:h-8 sm:w-8 text-red-300 hover:text-red-500 hover:bg-red-50 shrink-0">
                          {sortBy === "date" ? "..." : "..."}
                        </Button>
                      </div>
                    </TableCell> */}
                  </TableRow>
                ))}
                {!isActivityLoading && activities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No activity found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};

export default Overview;
