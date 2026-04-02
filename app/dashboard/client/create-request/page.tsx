import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { RequestForm } from "@/components/request-form"
import { Calendar, MapPin, DollarSign, FileText } from "lucide-react"

export const metadata: Metadata = generateMeta({
  title: "Plan Your Perfect Dining Experience",
  description: "Tell us a few details and get matched with top private chefs for your special event.",
})

export default async function CreateRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        {/* Premium Hero Section */}
        <div className="bg-gradient-to-b from-white to-gray-50 rounded-3xl p-12 mb-16">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Plan your perfect dining experience
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              Tell us a few details and get matched with top private chefs who'll create unforgettable moments for your special event.
            </p>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <RequestForm />
          </div>
          <div className="lg:col-span-4">
            {/* Right panel content will be moved to RequestForm component */}
          </div>
        </div>
      </div>
    </div>
  )
}
