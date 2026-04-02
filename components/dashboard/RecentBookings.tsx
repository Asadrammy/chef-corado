"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";

interface Booking {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  client: {
    name: string;
    email: string;
  };
  chef: {
    name: string;
    profileImage?: string;
  };
  proposal: {
    menu: {
      title: string;
    };
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

// Skeleton loader component
const BookingSkeleton = () => (
  <tr className="animate-pulse">
    <td className="py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 dark:bg-gray-700 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32 dark:bg-gray-700"></div>
        </div>
      </div>
    </td>
    <td className="py-3">
      <div className="h-4 bg-gray-200 rounded w-20 dark:bg-gray-700"></div>
    </td>
    <td className="py-3">
      <div className="h-4 bg-gray-200 rounded w-16 dark:bg-gray-700"></div>
    </td>
    <td className="py-3">
      <div className="h-6 bg-gray-200 rounded w-16 dark:bg-gray-700"></div>
    </td>
    <td className="py-3">
      <div className="h-4 bg-gray-200 rounded w-20 dark:bg-gray-700"></div>
    </td>
  </tr>
);

// Empty state component
const EmptyState = ({ userRole }: { userRole?: string }) => (
  <tr>
    <td colSpan={5} className="py-12 text-center">
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-800">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">No bookings found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get started by creating your first booking</p>
        </div>
        <Link
          href={`/dashboard/${userRole?.toLowerCase()}/bookings`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          View Bookings
        </Link>
      </div>
    </td>
  </tr>
);

export function RecentBookings() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  const { data: response, isLoading, error } = useQuery<{
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>({
    queryKey: ["recent-bookings", userId, userRole],
    queryFn: async () => {
      if (!userId || !userRole) throw new Error("User not authenticated");
      
      let url = `/api/bookings?limit=5`;
      if (userRole !== "ADMIN") {
        url += `&userId=${userId}&role=${userRole}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
    },
    enabled: !!userId && !!userRole,
    retry: 2,
  });

  const bookings = response?.bookings || [];

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Recent Bookings
            </h3>
          </div>
        </div>
        
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-gray-100 dark:border-gray-800 border-y">
              <tr>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  {userRole === "CHEF" ? "Client" : userRole === "CLIENT" ? "Chef" : "Client"}
                </th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Menu
                </th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Price
                </th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Status
                </th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <BookingSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Recent Bookings
            </h3>
          </div>
        </div>
        
        <div className="py-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900/20">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Failed to load bookings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Bookings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {response?.pagination?.total || 0} total bookings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.29004 5.90393H17.7067"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17.7075 14.0961H2.29085"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Filter
          </button>
          <Link
            href={`/dashboard/${userRole?.toLowerCase()}/bookings`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            See all
          </Link>
        </div>
      </div>
      
      <div className="max-w-full overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead className="border-gray-100 dark:border-gray-800 border-y">
            <tr>
              <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                {userRole === "CHEF" ? "Client" : userRole === "CLIENT" ? "Chef" : "Client"}
              </th>
              <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Menu
              </th>
              <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Price
              </th>
              <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Status
              </th>
              <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Date
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {bookings.length === 0 ? (
              <EmptyState userRole={userRole as string} />
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {(userRole === "CHEF" ? booking.client : booking.chef)?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {userRole === "CHEF" ? booking.client.name : booking.chef.name}
                        </p>
                        <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                          {userRole === "CHEF" ? booking.client.email : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {booking.proposal?.menu?.title || "Custom Menu"}
                  </td>
                  <td className="py-3 text-gray-900 font-medium text-theme-sm dark:text-white">
                    ${booking.totalPrice.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {format(new Date(booking.createdAt), "MMM dd, yyyy")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
