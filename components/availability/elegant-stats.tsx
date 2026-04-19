"use client";

import { motion } from "framer-motion";
import { Clock, Calendar, TrendingUp, Users } from "lucide-react";

interface ElegantStatsProps {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  upcomingBookings: number;
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

export function ElegantStats({
  totalSlots,
  availableSlots,
  bookedSlots,
  upcomingBookings,
}: ElegantStatsProps) {
  const stats: StatItem[] = [
    {
      label: "Total Slots",
      value: totalSlots,
      icon: <Calendar className="h-4 w-4" />,
      color: "text-gray-900",
      delay: 0,
    },
    {
      label: "Available",
      value: availableSlots,
      icon: <Clock className="h-4 w-4" />,
      color: "text-emerald-600",
      delay: 0.1,
    },
    {
      label: "Booked",
      value: bookedSlots,
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600",
      delay: 0.2,
    },
    {
      label: "Upcoming",
      value: upcomingBookings,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-purple-600",
      delay: 0.3,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: stat.delay, duration: 0.3 }}
              className="flex items-center gap-3 group"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-2 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-shadow"
              >
                <div className={stat.color}>{stat.icon}</div>
              </motion.div>
              <div className="space-y-0.5">
                <div className={`text-2xl font-bold ${stat.color} transition-colors`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
