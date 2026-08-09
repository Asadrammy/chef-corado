"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { HelpCircle, LifeBuoy, Mail, MessageSquareText, Search, ChevronDown, ChevronUp, BookOpen, Wallet, Calendar, Users, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type FAQCategory = "getting-started" | "bookings" | "payments" | "visibility" | "account"

type FAQ = {
  id: string
  category: FAQCategory
  question: string
  answer: string
  keywords: string[]
  links?: { label: string; href: string }[]
}

const faqData: FAQ[] = [
  // Getting Started
  {
    id: "gs-1",
    category: "getting-started",
    question: "How do I get started as a chef on the platform?",
    answer: "Complete your profile with bio, cuisine type, events per month, saved service radius, legal confirmations, and certificate details where requested. Add menus and set availability. Chef approval is reviewed by the platform team; it is not automatic.",
    keywords: ["start", "begin", "setup", "new", "onboard"],
    links: [
      { label: "Profile", href: "/dashboard/chef/profile" },
      { label: "Menus", href: "/dashboard/chef/menus" },
      { label: "Availability", href: "/dashboard/chef/availability" },
    ],
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "What makes a complete chef profile?",
    answer: "A complete profile includes a profile photo, bio, cuisine specialties, professional certifications where available, saved service radius, events per month, legal confirmations, at least one menu, and Stripe connection for payouts. Search and ranking use profile quality signals, but the platform does not guarantee a fixed placement from profile completion alone.",
    keywords: ["profile", "complete", "photo", "bio", "required"],
    links: [{ label: "Profile", href: "/dashboard/chef/profile" }],
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "How long does profile approval take?",
    answer: "Profile review is handled by the platform team. Timing can vary depending on the information and documents supplied. You can keep editing your profile while approval is pending.",
    keywords: ["approval", "approved", "pending", "review", "wait"],
    links: [{ label: "Profile", href: "/dashboard/chef/profile" }],
  },
  // Bookings
  {
    id: "bk-1",
    category: "bookings",
    question: "How do client requests work?",
    answer: "Clients submit requests with event details, service type, budget, and location. Open customer requests within your saved service radius appear in Requests. You can send one proposal per request with custom pricing and an optional menu. Each request can receive up to 10 quotes total across the platform.",
    keywords: ["request", "quote", "client", "send", "proposal"],
    links: [{ label: "Requests", href: "/dashboard/chef/requests" }],
  },
  {
    id: "bk-2",
    category: "bookings",
    question: "Can I modify a quote after sending it?",
    answer: "Not as a self-service quote edit. The current proposal flow lets you send one proposal per request. If pricing or scope needs to change after sending, message the client in-platform and contact support if an accepted or payment-related proposal needs admin handling.",
    keywords: ["quote", "modify", "update", "change", "price"],
    links: [
      { label: "Messages", href: "/dashboard/chef/messages" },
      { label: "Email support", href: "mailto:info@chefachef.co.uk" },
    ],
  },
  {
    id: "bk-3",
    category: "bookings",
    question: "How do blocked dates work?",
    answer: "Open the availability calendar, choose a day, and mark it unavailable when you need to block travel, prep, or personal time. Availability is checked for instant-booked experiences. Marketplace requests are still shown by request date and service radius, so keep availability accurate and discuss conflicts before proposing.",
    keywords: ["availability", "block", "calendar", "date", "unavailable"],
    links: [{ label: "Availability", href: "/dashboard/chef/availability" }],
  },
  {
    id: "bk-4",
    category: "bookings",
    question: "What happens when a booking is confirmed?",
    answer: "Confirmed bookings appear in your bookings area. Client payments are held through the platform payment flow where Stripe checkout is used. Completion and payout release involve the platform payment status and may require admin processing depending on the booking/payment state.",
    keywords: ["confirmed", "booking", "status", "active", "payment"],
    links: [{ label: "Bookings", href: "/dashboard/chef/bookings" }],
  },
  // Payments
  {
    id: "pm-1",
    category: "payments",
    question: "How do I set up payouts?",
    answer: "Go to Settings and use the Stripe connection action if it is available for your account. Complete Stripe onboarding to connect a payout account. Connecting Stripe does not by itself guarantee automatic release timing; payout release depends on completed booking/payment status and platform processing.",
    keywords: ["payout", "stripe", "bank", "payment", "connect", "money"],
    links: [{ label: "Settings", href: "/dashboard/chef/settings" }],
  },
  {
    id: "pm-2",
    category: "payments",
    question: "When do I receive payment for a booking?",
    answer: "Payment release is tied to the booking and payment record. The admin payment tools can release held funds when the booking/payment state allows it. Check your Payouts page and Stripe account for status; contact support if a completed event has not moved forward.",
    keywords: ["payment", "receive", "when", "transfer", "payout"],
    links: [
      { label: "Payouts", href: "/dashboard/chef/payouts" },
      { label: "Email support", href: "mailto:info@chefachef.co.uk" },
    ],
  },
  {
    id: "pm-3",
    category: "payments",
    question: "What fees does the platform charge?",
    answer: "The system stores platform commission and payout amounts on payment records, but this help page does not publish a fixed fee percentage. Use your payment/payout breakdown for a specific booking, and contact support for commercial fee questions.",
    keywords: ["fee", "commission", "percentage", "charge", "deduct"],
    links: [{ label: "Payouts", href: "/dashboard/chef/payouts" }],
  },
  {
    id: "pm-4",
    category: "payments",
    question: "Why is my Stripe showing as not configured?",
    answer: "This can mean your Stripe onboarding is incomplete or the platform payment configuration needs attention. Contact support before relying on new paid bookings if Stripe is not configured.",
    keywords: ["stripe", "configured", "api", "key", "error"],
    links: [{ label: "Email support", href: "mailto:info@chefachef.co.uk" }],
  },
  // Visibility
  {
    id: "vis-1",
    category: "visibility",
    question: "How do I improve my marketplace visibility?",
    answer: "Keep your profile, menus, availability, response habits, and reviews strong. The platform uses profile and activity signals in several places, but this page should not promise a specific automatic ranking outcome.",
    keywords: ["visibility", "rank", "search", "appear", "find"],
    links: [
      { label: "Profile", href: "/dashboard/chef/profile" },
      { label: "Menus", href: "/dashboard/chef/menus" },
    ],
  },
  {
    id: "vis-2",
    category: "visibility",
    question: "How is my response rate calculated?",
    answer: "Response activity is tracked in chef dashboard metrics where data is available. It is useful operationally, but the current help text should not claim a guaranteed direct ranking formula.",
    keywords: ["response", "rate", "reply", "time", "ranking"],
    links: [{ label: "Messages", href: "/dashboard/chef/messages" }],
  },
  {
    id: "vis-3",
    category: "visibility",
    question: "Do reviews affect my visibility?",
    answer: "Reviews are stored after completed bookings and are visible on chef-facing/customer-facing surfaces where implemented. Strong reviews can improve trust, but the exact ranking effect is not published as a fixed rule.",
    keywords: ["review", "rating", "stars", "feedback", "ranking"],
  },
  // Account
  {
    id: "ac-1",
    category: "account",
    question: "How do I update my profile photo?",
    answer: "Go to Profile and update your profile image if the upload control is available on your account. Use a clear professional image and keep file size within the uploader's limit.",
    keywords: ["photo", "image", "profile", "upload", "picture"],
    links: [{ label: "Profile", href: "/dashboard/chef/profile" }],
  },
  {
    id: "ac-2",
    category: "account",
    question: "Can I change my service radius?",
    answer: "Yes! In Profile Settings, adjust your saved service radius to expand or contract your service area. A larger radius means more potential requests but may include locations with longer travel times. The Requests page slider only narrows the current view temporarily.",
    keywords: ["radius", "service", "area", "distance", "location"],
    links: [{ label: "Profile", href: "/dashboard/chef/profile" }],
  },
  {
    id: "ac-3",
    category: "account",
    question: "How do notification preferences work?",
    answer: "In Settings, you can manage available notification preferences. In-app notifications appear in the notification center. Email delivery depends on the configured notification service and your saved preferences.",
    keywords: ["notification", "email", "alert", "preference", "settings"],
    links: [{ label: "Settings", href: "/dashboard/chef/settings" }],
  },
  {
    id: "ac-4",
    category: "account",
    question: "Can I preview my public profile?",
    answer: "Use the public profile preview link from Profile when available. If your profile is not approved, treat preview as a review aid rather than a guarantee that clients can find or book you publicly.",
    keywords: ["preview", "public", "view", "see", "profile"],
    links: [{ label: "Profile", href: "/dashboard/chef/profile" }],
  },
  {
    id: "ac-5",
    category: "account",
    question: "How do I change my email or password?",
    answer: "Email changes require support assistance for security. Contact info@chefachef.co.uk with your request. For password changes, use the Forgot Password link on the login page or contact support if you cannot complete the reset.",
    keywords: ["email", "password", "change", "update", "security"],
    links: [
      { label: "Forgot Password", href: "/forgot-password" },
      { label: "Email support", href: "mailto:info@chefachef.co.uk" },
    ],
  },
  // Additional Bookings
  {
    id: "bk-5",
    category: "bookings",
    question: "What if a client cancels a confirmed booking?",
    answer: "If a booking is cancelled, check the booking status and any payment/refund state. Cancellation and refund handling may require admin support, especially once payment has been captured or held.",
    keywords: ["cancel", "cancellation", "client", "refund", "policy"],
    links: [
      { label: "Bookings", href: "/dashboard/chef/bookings" },
      { label: "Email support", href: "mailto:info@chefachef.co.uk" },
    ],
  },
  {
    id: "bk-6",
    category: "bookings",
    question: "Can I decline a booking request?",
    answer: "You can choose not to send a proposal for a request. If you are already in conversation with a client, reply in Messages so the client has a clear answer. There is no separate automated decline button for every marketplace request.",
    keywords: ["decline", "reject", "cancel", "request", "refuse"],
    links: [
      { label: "Requests", href: "/dashboard/chef/requests" },
      { label: "Messages", href: "/dashboard/chef/messages" },
    ],
  },
  // Additional Payments
  {
    id: "pm-5",
    category: "payments",
    question: "How do I handle tips from clients?",
    answer: "The current checkout flow charges the accepted proposal amount. Do not rely on an automatic tip field unless it is visible during checkout for that booking. If a client wants to add extra payment, keep the discussion on-platform and contact support.",
    keywords: ["tip", "gratuity", "extra", "bonus", "payment"],
    links: [{ label: "Email support", href: "mailto:info@chefachef.co.uk" }],
  },
  // Additional Visibility
  {
    id: "vis-4",
    category: "visibility",
    question: "What is the daily checklist and how does it help?",
    answer: "The daily checklist is an operational reminder for reviewing requests, responding to messages, and keeping your profile active. It is helpful, but it should not be read as an automatic ranking guarantee.",
    keywords: ["checklist", "daily", "goals", "tasks", "improve"],
    links: [{ label: "Chef Dashboard", href: "/dashboard/chef" }],
  },
]

const categoryConfig: Record<FAQCategory, { label: string; icon: typeof BookOpen; color: string }> = {
  "getting-started": { label: "Getting Started", icon: BookOpen, color: "border-primary/20 bg-primary/10 text-primary" },
  "bookings": { label: "Bookings", icon: Calendar, color: "border-primary/20 bg-primary/10 text-primary" },
  "payments": { label: "Payments", icon: Wallet, color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  "visibility": { label: "Visibility & Ranking", icon: Users, color: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  "account": { label: "Account Settings", icon: Settings, color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800" },
}

export default function ChefHelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | "all">("all")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const filteredFAQs = useMemo(() => {
    return faqData.filter((faq) => {
      const matchesSearch = searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.keywords.some((kw) => kw.includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const toggleExpand = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedIds(new Set(filteredFAQs.map((f) => f.id)))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
            <LifeBuoy className="size-3.5" />
            Support workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Chef help desk</h1>
          <p className="text-sm leading-6 text-muted-foreground">Browse the knowledge base, contact support by email, and check the latest guidance for menus, compliance, and requests. Live chat is planned for a future release.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main Content */}
        <div className="space-y-4">
          {/* Search */}
          <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-2xl border-white/60 bg-white/70 pl-10 dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3 py-1.5"
              onClick={() => setSelectedCategory("all")}
            >
              All ({faqData.length})
            </Badge>
            {(Object.keys(categoryConfig) as FAQCategory[]).map((cat) => {
              const config = categoryConfig[cat]
              const count = faqData.filter((f) => f.category === cat).length
              const Icon = config.icon
              return (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1.5",
                    selectedCategory !== cat && config.color
                  )}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <Icon className="mr-1 size-3" />
                  {config.label} ({count})
                </Badge>
              )
            })}
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredFAQs.length} {filteredFAQs.length === 1 ? "question" : "questions"} found
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll} className="rounded-xl text-xs">
                Expand all
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} className="rounded-xl text-xs">
                Collapse all
              </Button>
            </div>
          </div>

          {/* FAQ List */}
          <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="size-5" />
                Frequently asked questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFAQs.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-8 text-center">
                  <p className="text-muted-foreground">No questions match your search.</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedCategory("all")
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                filteredFAQs.map((faq) => {
                  const isExpanded = expandedIds.has(faq.id)
                  const categoryStyle = categoryConfig[faq.category]
                  return (
                    <div
                      key={faq.id}
                      className="rounded-[24px] border border-white/60 bg-white/70 shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/10 dark:bg-white/5"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(faq.id)}
                        className="flex w-full items-start justify-between gap-3 p-4 text-left"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0", categoryStyle.color)}>
                              {categoryStyle.label}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground">{faq.question}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/60 px-4 py-4 dark:border-white/10">
                          <p className="text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                          {faq.links?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {faq.links.map((link) => (
                                <Button key={`${faq.id}-${link.href}-${link.label}`} asChild variant="outline" size="sm" className="rounded-xl">
                                  <Link href={link.href}>{link.label}</Link>
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="size-5" />
                Support channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Link href="mailto:info@chefachef.co.uk">
                  <Mail className="size-4" />
                  <span>Email support</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Link href="mailto:info@chefachef.co.uk?subject=Chefachef%20Help%20Request" target="_blank" rel="noreferrer">
                  <MessageSquareText className="size-4" />
                  <span>Open support request</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <CardHeader>
              <CardTitle>Support hours</CardTitle>
              <CardDescription>Our support team is available to help you.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <p className="font-medium text-foreground">Monday - Friday</p>
                <p className="text-muted-foreground">9:00 AM - 6:00 PM EST</p>
                <p className="mt-3 text-muted-foreground">
                  For urgent issues outside these hours, please email info@chefachef.co.uk and we will respond as soon as possible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
