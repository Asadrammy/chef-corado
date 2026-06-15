"use client";

import { motion } from "framer-motion";
import { Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface ProductHeaderProps {
  onAddAvailability: () => void;
  onBulkBlock: () => void;
  onCopyPreviousWeek: () => void;
  onClearAvailability: () => void;
}

export function ProductHeader({
  onAddAvailability,
  onBulkBlock,
  onCopyPreviousWeek,
  onClearAvailability,
}: ProductHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          {/* Left: Title with visual impact */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-lg opacity-50" />
                <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 rounded-2xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </motion.div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Availability calendar
              </h1>
            </div>
            <p className="text-lg text-gray-500 pl-14">
              Manage your schedule, available time slots, and unavailable dates
            </p>
          </div>

          {/* Right: Actions with emphasis */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 rounded-2xl border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="hidden sm:inline">Quick Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuItem 
                  onClick={onBulkBlock}
                  className="rounded-xl cursor-pointer"
                >
                  Mark Dates Unavailable
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onCopyPreviousWeek}
                  className="rounded-xl cursor-pointer"
                >
                  Copy Available Times from Previous Week
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onClearAvailability}
                  className="rounded-xl cursor-pointer text-red-600"
                >
                  Remove All Availability
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={onAddAvailability}
                size="lg"
                className="gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Mark Date Available
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
