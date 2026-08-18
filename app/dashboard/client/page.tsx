import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { MarketplaceMetrics } from "@/components/dashboard/MarketplaceMetrics"
import { RecentBookings } from "@/components/dashboard/RecentBookings"
import LazyChart from "@/components/dashboard/LazyChart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExperienceCard } from "@/components/experiences/experience-card"
import { Calendar, Users, FileText, ArrowRight, Search, Star } from "lucide-react"
import Link from "next/link"
import { UserActivationFlow } from "@/components/onboarding/UserActivationFlow"
import { ConversionSignals } from "@/components/conversion/ConversionSignals"
import { TrustSignals } from "@/components/trust/TrustSignals"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

type DashboardRequest = {
  id: string
  status?: string | null
}

type DashboardProposal = {
  id: string
  status: string
}

type DashboardBooking = {
  id: string
  status: string
}

type DashboardExperience = {
  id: string
  title: string
  description: string
  price: number
  currency?: string | null
  duration: number
  experienceImage?: string | null
  images?: string[]
  category?: string | null
  cuisineType?: string | null
  eventType?: string | null
  minGuests?: number | null
  maxGuests?: number | null
  pricePerPerson?: number | null
  chef: {
    id: string
    user: {
      name: string
    }
  }
}

type RequestsResponse = { requests: DashboardRequest[] }
type ProposalsResponse = { proposals: DashboardProposal[] }
type BookingsResponse = { bookings: DashboardBooking[] }
type ExperiencesResponse = { experiences: DashboardExperience[] }

export const metadata: Metadata = generateMeta({
  title: "Client Dashboard",
  description: "Manage requests, proposals, and bookings as a client in the chef marketplace.",
})

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  // Fetch real data for dashboard
  const cookieHeader = (await cookies()).toString()
  const baseUrl = getConfiguredAppBaseUrl()

  // Fetch requests, proposals, and bookings with error handling
  let requests: DashboardRequest[] = []
  let proposals: DashboardProposal[] = []
  let bookings: DashboardBooking[] = []
  let experiences: DashboardExperience[] = []
  let hasError = false
  let errorMessage = ""

  try {
    const [requestsResponse, proposalsResponse, bookingsResponse, experiencesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/requests`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/proposals`, {
        cache: "no-store", 
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/bookings`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/experiences?limit=6&sortBy=createdAt&sortOrder=desc`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
    ])

    if (!requestsResponse.ok || !proposalsResponse.ok || !bookingsResponse.ok || !experiencesResponse.ok) {
      hasError = true
      errorMessage = "Failed to fetch dashboard data"
    } else {
      requests = ((await requestsResponse.json()) as RequestsResponse).requests || []
      proposals = ((await proposalsResponse.json()) as ProposalsResponse).proposals || []
      bookings = ((await bookingsResponse.json()) as BookingsResponse).bookings || []
      experiences = ((await experiencesResponse.json()) as ExperiencesResponse).experiences || []
    }
  } catch (error) {
    hasError = true
    errorMessage = "Network error. Please try again."
  }

  // Calculate stats
  const totalRequests = requests.length
  const pendingProposals = proposals.filter(p => p.status === "PENDING").length
  const activeBookings = bookings.filter(b => b.status !== "CANCELLED").length

  return (
    <div className="space-y-10">
      {/* Hero Section - Premium SaaS Style */}
      <header className="brand-surface relative overflow-hidden rounded-3xl shadow-lg shadow-black/5">
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-5 dark:opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-[hsl(var(--brand-chocolate)/0.30)] blur-3xl"></div>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 p-8 lg:p-12">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Welcome to your workspace
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Plan your
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"> next event</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Submit event requests, collect proposals from talented chefs, and manage your bookings - all in one beautiful workspace.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="brand-gradient-button shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3">
                <Link href="/dashboard/client/create-request">
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Create Request
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-border hover:bg-muted/50 hover:border-border/80 px-8 py-3">
                <Link href="/browse-chefs">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Chefs
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Right Visual Element */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-sm aspect-square">
              {/* Gradient circles */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-[hsl(var(--brand-chocolate)/0.20)] blur-2xl"></div>
              <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-primary/30 to-[hsl(var(--brand-chocolate)/0.30)] blur-xl"></div>
              
              {/* Central decorative element */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="brand-gradient-button flex h-32 w-32 items-center justify-center rounded-3xl shadow-2xl">
                  <Calendar className="h-16 w-16" />
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute top-8 right-8 w-16 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute bottom-8 left-8 w-16 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center">
                <Star className="h-8 w-8 text-[hsl(var(--brand-chocolate))] dark:text-primary" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* User Activation Flow - Onboarding */}
      <section className="space-y-6">
        <UserActivationFlow userRole="CLIENT" />
      </section>

      {/* Stats Overview - Premium Analytics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="w-13 h-13 flex items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-primary">+{totalRequests}</span>
                <span className="text-xs text-muted-foreground">new</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{totalRequests}</h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
            </div>
          </div>
        </div>
        
        <div className="group overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="w-13 h-13 flex items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-primary">+{pendingProposals}</span>
                <span className="text-xs text-muted-foreground">pending</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{pendingProposals}</h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Proposals</p>
            </div>
          </div>
        </div>
        
        <div className="group overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-500/10 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="w-13 h-13 flex items-center justify-center rounded-xl bg-emerald-500/10 shadow-sm">
                <Calendar className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              </div>
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {activeBookings} active
              </Badge>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{activeBookings}</h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bookings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Overview</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">Monitor your requests and booking trends</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-6">
            <MarketplaceMetrics />
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-6">
            <LazyChart />
          </div>
        </div>
        
        {/* Trust Signals Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-6">
          <TrustSignals />
        </div>
      </section>

      {/* Quick Actions Section - Premium Large Cards */}
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Manage your client activities with these powerful tools
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/client/create-request">
            <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]">
              <div className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create Request</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Submit a new event request and get proposals from talented chefs
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/client/requests">
            <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]">
              <div className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">My Requests</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      View and manage all your event requests in one place
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <span>{totalRequests} requests</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/client/proposals">
            <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]">
              <div className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-orange-50 dark:bg-orange-900/20 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Proposals</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Review proposals from interested chefs for your events
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                    <span>{pendingProposals} pending</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/experiences">
            <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]">
              <div className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Browse Experiences</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Discover amazing culinary experiences from talented chefs
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <span>Explore</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/client/bookings">
            <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]">
              <div className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-green-50 dark:bg-green-900/20 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Track Bookings</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Monitor your active bookings and upcoming events
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <span>{activeBookings} active</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Recommended Experiences Section - Netflix Style */}
      <section className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Recommended Experiences</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
              Discover unforgettable culinary experiences from world-class chefs
            </p>
          </div>
          <Link href="/experiences">
            <Button variant="outline" size="lg" className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3 rounded-xl">
              View All
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        {experiences.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-16 text-center">
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Calendar className="h-9 w-9" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  No experiences available yet
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  Check back soon for amazing culinary experiences from our talented chefs, or explore the full marketplace.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/experiences">
                  <Button size="lg" className="brand-gradient-button rounded-xl px-8 py-3 shadow-lg transition-all duration-200 hover:shadow-xl">
                    <Search className="mr-2 h-5 w-5" />
                    Browse Marketplace
                  </Button>
                </Link>
                <Link href="/dashboard/client/create-request">
                  <Button variant="outline" size="lg" className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-xl">
                    <FileText className="mr-2 h-5 w-5" />
                    Create Request
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((experience) => (
              <div key={experience.id} className="group space-y-4">
                {/* Enhanced Experience Card with Netflix-style hover */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  {/* Image with gradient overlay */}
                  <div className="absolute inset-0">
                    {experience.images && experience.images.length > 0 ? (
                      <img 
                        src={experience.images[0]} 
                        alt={experience.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/70 via-primary/45 to-[hsl(var(--brand-chocolate)/0.55)]"></div>
                    )}
                    
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                    {/* Hover overlay */}
                    <div className="pointer-events-auto absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Link
                          href={`/experiences/${experience.id}`}
                          className="relative z-10 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-colors hover:bg-primary/10"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white rounded-lg">
                          {experience.category || 'Experience'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold leading-tight line-clamp-2">
                        {experience.title}
                      </h3>
                      
                      <p className="text-sm text-white/90 line-clamp-2">
                        {experience.description}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">
                            {experience.minGuests || 2}-{experience.maxGuests || 10} guests
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {formatCurrency(experience.pricePerPerson ?? experience.price ?? 0, experience.currency ?? "GBP")}
                          </p>
                          <p className="text-xs text-white/70">per person</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conversion Signals for each experience */}
                <ConversionSignals 
                  type="experience" 
                  data={experience}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Bookings Table - Full Width */}
      <section className="space-y-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 p-6">
          <RecentBookings />
        </div>
      </section>
    </div>
  )
}
