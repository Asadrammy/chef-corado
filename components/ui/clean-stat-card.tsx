"use client"

interface CleanStatCardProps {
  label: string
  value: string | number
  trend?: string
}

export function CleanStatCard({ label, value, trend }: CleanStatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="space-y-2">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-sm text-gray-600">{trend}</p>
        )}
      </div>
    </div>
  )
}
