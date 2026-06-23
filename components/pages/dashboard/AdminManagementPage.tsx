"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import CustomPagination from "@/components/shared/CustomPagination";
import {
  useGetAllAdminsQuery,
  useRemoveAdminMutation,
} from "@/lib/api/adminApi";
import { useAddAdminMutation, getRtkQueryErrorMessage } from "@/lib/api/authApi";

const AdminManagementPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, refetch } = useGetAllAdminsQuery({
    page: currentPage,
    limit: itemsPerPage,
  });
  const [addAdmin, { isLoading: isAdding }] = useAddAdminMutation();
  const [removeAdmin, { isLoading: isRemoving }] = useRemoveAdminMutation();

  const admins = data?.data ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages =
    data?.meta?.totalPage ??
    data?.meta?.totalPages ??
    Math.max(1, Math.ceil(totalItems / itemsPerPage) || 1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);

  const resetAddForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
  };

  const handleAddAdmin = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    if (!fn || !ln || !em || !password) {
      toast.error("Please fill in First name, Last name, Email, and Password.");
      return;
    }
    try {
      const res = await addAdmin({
        firstName: fn,
        lastName: ln,
        email: em,
        password,
        role: "ADMIN",
      }).unwrap();
      toast.success(res.message || "Admin added successfully.");
      setIsAddModalOpen(false);
      resetAddForm();
      refetch();
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const confirmRemoveAdmin = (id: string) => {
    setAdminToRemove(id);
    setIsRemoveModalOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (adminToRemove) {
      try {
        const res = await removeAdmin(adminToRemove).unwrap();
        toast.success(res.message || "Admin removed successfully.");
        setIsRemoveModalOpen(false);
        setAdminToRemove(null);
      } catch (error) {
        toast.error(getRtkQueryErrorMessage(error));
      }
    }
  };

  return (
    <div className="w-full mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          Admin List
        </h1>
        <Dialog
          open={isAddModalOpen}
          onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) resetAddForm();
          }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-[#A655F6] hover:bg-[#9344E0] text-white rounded-md px-6">
              <Plus className="h-5 w-5 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-[#A655F6] font-bold text-lg">
                <span>Resale AI</span>
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Add new admin
              </DialogTitle>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Invite up to 5 team members to join your plan. Once they accept
                your invitation, they&apos;ll get access to modify
                Solicitation&apos;s under your subscription.
              </p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-first-name" className="text-gray-700 font-medium">
                  First Name
                </Label>
                <Input
                  id="add-first-name"
                  autoComplete="given-name"
                  className="bg-white border-gray-200 focus-visible:ring-[#A655F6]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-last-name" className="text-gray-700 font-medium">
                  Last Name
                </Label>
                <Input
                  id="add-last-name"
                  autoComplete="family-name"
                  className="bg-white border-gray-200 focus-visible:ring-[#A655F6]"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-email" className="text-gray-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="add-email"
                  type="email"
                  autoComplete="email"
                  className="bg-white border-gray-200 focus-visible:ring-[#A655F6]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <Input
                  id="add-password"
                  type="password"
                  autoComplete="new-password"
                  className="bg-white border-gray-200 focus-visible:ring-[#A655F6]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3 sm:gap-2 flex-col sm:flex-row">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 h-10 px-8">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleAddAdmin}
                disabled={isAdding}
                className="w-full sm:w-auto bg-[#A655F6] hover:bg-[#9344E0] text-white h-10 px-6">
                {isAdding ? "Adding..." : "Add admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* {isLoading && (
        <div className="space-y-3 mb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )} */}

      {/* Desktop Table View - Hidden on mobile and tablets */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="border-b-0 hover:bg-[#eff1f4]">
                <TableHead className="py-4 text-gray-600 font-medium">
                  Name
                </TableHead>
                <TableHead className="py-4 text-gray-600 font-medium">
                  Email
                </TableHead>
                <TableHead className="py-4 text-gray-600 font-medium">
                  Role
                </TableHead>
                <TableHead className="py-4 text-gray-600 font-medium text-center">
                  Status
                </TableHead>
                <TableHead className="py-4 text-gray-600 font-medium text-center">
                  View Profile
                </TableHead>
                <TableHead className="py-4 text-gray-600 font-medium text-center">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell className="py-5"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-5"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="py-5 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell className="py-5 text-center"><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                    <TableCell className="py-5 text-center"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading && admins.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-gray-500">
                    No admins found.
                  </TableCell>
                </TableRow>
              )}
              {admins.map((admin) => (
                <TableRow
                  key={admin.id}
                  className="hover:bg-gray-50 border-gray-100">
                  <TableCell className="py-5 font-medium text-gray-700">
                    {`${admin.firstName} ${admin.lastName}`.trim()}
                  </TableCell>
                  <TableCell className="py-5 text-gray-600">
                    {admin.email}
                  </TableCell>
                  <TableCell className="py-5 text-gray-600">
                    {admin.role}
                  </TableCell>
                  <TableCell className="py-5 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                      {admin.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-5 text-center">
                    <Button
                      variant="outline"
                      className="h-8 px-6 text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700 rounded-md text-xs font-normal"
                      asChild>
                      <Link
                        href={`/dashboard/admin/admin-management/profile?id=${admin.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="py-5 text-center">
                    <Button
                      variant="outline"
                      className="h-8 px-4 text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 rounded-md text-xs font-normal"
                      disabled={isRemoving}
                      onClick={() => confirmRemoveAdmin(admin.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile & Tablet Card View - Shown on screens smaller than lg */}
      <div className="lg:hidden space-y-4">
        {isLoading &&
          Array.from({ length: Math.min(itemsPerPage, 4) }).map((_, i) => (
            <div
              key={`admin-card-skel-${i}`}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full max-w-sm" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        {!isLoading &&
          admins.map((admin) => (
          <div
            key={admin.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base">
                  {`${admin.firstName} ${admin.lastName}`.trim()}
                </h3>
                <p className="text-sm text-gray-600 mt-1 break-all">
                  {admin.email}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600 ml-2 shrink-0">
                {admin.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Role:</span>
              <span className="text-gray-700 font-medium">{admin.role}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700 rounded-md text-sm">
                <Link href={`/dashboard/admin/admin-management/profile?id=${admin.id}`}>
                  View Profile
                </Link>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 rounded-md text-sm"
                disabled={isRemoving}
                onClick={() => confirmRemoveAdmin(admin.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && admins.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500">
            No admins found.
          </div>
        )}
      </div>

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

      {/* Remove Confirmation Dialog */}
      <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-6 sm:p-8 bg-white rounded-xl text-center">
          <div className="mx-auto bg-red-50 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <Info className="h-8 w-8 text-red-500" />
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            Are you sure you want to <br className="hidden sm:block" /> remove
            this admin?
          </DialogTitle>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-center w-full">
            <Button
              variant="destructive"
              disabled={isRemoving}
              className="w-full sm:w-32 h-10 bg-red-500 hover:bg-red-600 border border-transparent"
              onClick={handleRemoveAdmin}>
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-32 h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => setIsRemoveModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagementPage;
