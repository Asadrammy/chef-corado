"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { HelpCircle, LifeBuoy, Mail, MessageSquareText, Search, ChevronDown, ChevronUp, BookOpen, DollarSign, Calendar, Users, Settings } from "lucide-react"

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
}

const faqData: FAQ[] = [
  // Getting Started
  {
    id: "gs-1",
    category: "getting-started",
    question: "How do I get started as a chef on the platform?",
    answer: "Complete your profile with bio, cuisine type, and service radius. Add at least one menu with photos. Set your availability calendar. Once approved by our team, you'll appear in marketplace searches and can start receiving booking requests.",
    keywords: ["start", "begin", "setup", "new", "onboard"],
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "What makes a complete chef profile?",
    answer: "A complete profile includes: profile photo, bio describing your culinary background, cuisine specialties, certifications, service radius, pricing information, at least one menu, and connected Stripe account for payouts. Complete profiles rank higher in search results.",
    keywords: ["profile", "complete", "photo", "bio", "required"],
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "How long does profile approval take?",
    answer: "Profile reviews typically take 1-3 business days. You'll receive an email notification once approved. While waiting, you can preview your profile using the 'Preview public profile' button in your profile settings.",
    keywords: ["approval", "approved", "pending", "review", "wait"],
  },
  // Bookings
  {
    id: "bk-1",
    category: "bookings",
    question: "How do client requests work?",
    answer: "Clients submit requests with event details, budget, and location. Requests matching your radius appear in your Requests tab. You can send quotes with custom pricing and menus. Clients review quotes and may message you before booking.",
    keywords: ["request", "quote", "client", "send", "proposal"],
  },
  {
    id: "bk-2",
    category: "bookings",
    question: "Can I modify a quote after sending it?",
    answer: "Yes! Open the conversation with the client from your Messages tab. Use the quote update action in the chat thread to send a revised quote. The client will see the updated pricing and can accept the new quote.",
    keywords: ["quote", "modify", "update", "change", "price"],
  },
  {
    id: "bk-3",
    category: "bookings",
    question: "How do blocked dates work?",
    answer: "Open the availability calendar, choose a day, and mark it unavailable when you need to block travel, prep, or personal time. Unavailable dates prevent new bookings but don't affect existing confirmed bookings.",
    keywords: ["availability", "block", "calendar", "date", "unavailable"],
  },
  {
    id: "bk-4",
    category: "bookings",
    question: "What happens when a booking is confirmed?",
    answer: "You'll receive a notification and the booking moves to your Active tab. The client's payment is held securely until the event is completed. After the event, mark it as complete to trigger payout processing.",
    keywords: ["confirmed", "booking", "status", "active", "payment"],
  },
  // Payments
  {
    id: "pm-1",
    category: "payments",
    question: "How do I set up payouts?",
    answer: "Go to Settings > Stripe Connection and click 'Connect Stripe'. Complete the Stripe onboarding to link your bank account. Once connected, payouts are processed automatically 2-3 business days after completed events.",
    keywords: ["payout", "stripe", "bank", "payment", "connect", "money"],
  },
  {
    id: "pm-2",
    category: "payments",
    question: "When do I receive payment for a booking?",
    answer: "Payments are released 24-48 hours after you mark a booking as completed. The funds transfer to your connected bank account via Stripe. Check your Stripe dashboard for real-time payment status.",
    keywords: ["payment", "receive", "when", "transfer", "payout"],
  },
  {
    id: "pm-3",
    category: "payments",
    question: "What fees does the platform charge?",
    answer: "The platform fee is deducted from each booking total before payout. The exact percentage varies by plan. View your earnings breakdown in the dashboard, which shows gross amount, platform fee, and net payout.",
    keywords: ["fee", "commission", "percentage", "charge", "deduct"],
  },
  {
    id: "pm-4",
    category: "payments",
    question: "Why is my Stripe showing as not configured?",
    answer: "This means Stripe API keys aren't set up in the system. Contact support or check with your administrator. You can still accept bookings, but payouts will be held until Stripe is properly configured.",
    keywords: ["stripe", "configured", "api", "key", "error"],
  },
  // Visibility
  {
    id: "vis-1",
    category: "visibility",
    question: "How do I improve my marketplace visibility?",
    answer: "Complete your profile 100%, keep menus updated with photos, respond quickly to messages, maintain accurate availability, and collect positive reviews. Response rate and rating significantly impact your search ranking.",
    keywords: ["visibility", "rank", "search", "appear", "find"],
  },
  {
    id: "vis-2",
    category: "visibility",
    question: "How is my response rate calculated?",
    answer: "Response rate measures what percentage of client messages receive your reply. Faster responses (within a few hours) improve your rate. This metric directly affects your ranking in client searches.",
    keywords: ["response", "rate", "reply", "time", "ranking"],
  },
  {
    id: "vis-3",
    category: "visibility",
    question: "Do reviews affect my visibility?",
    answer: "Yes! Chefs with higher average ratings and more reviews rank better in searches. Encourage satisfied clients to leave reviews after events. Respond professionally to all reviews to show engagement.",
    keywords: ["review", "rating", "stars", "feedback", "ranking"],
  },
  // Account
  {
    id: "ac-1",
    category: "account",
    question: "How do I update my profile photo?",
    answer: "Go to Profile Settings, hover over your current photo, and click the edit icon. Upload a new image (JPG, PNG, or WebP, max 5MB). High-quality, professional photos perform best with clients.",
    keywords: ["photo", "image", "profile", "upload", "picture"],
  },
  {
    id: "ac-2",
    category: "account",
    question: "Can I change my service radius?",
    answer: "Yes! In Profile Settings, adjust your radius to expand or contract your service area. A larger radius means more potential requests but may include locations with longer travel times.",
    keywords: ["radius", "service", "area", "distance", "location"],
  },
  {
    id: "ac-3",
    category: "account",
    question: "How do notification preferences work?",
    answer: "In Settings, you can toggle email and in-app notifications for messages, bookings, and new requests. Email notifications are sent immediately for important events, while in-app notifications appear in your notification center.",
    keywords: ["notification", "email", "alert", "preference", "settings"],
  },
  {
    id: "ac-4",
    category: "account",
    question: "Can I preview my public profile?",
    answer: "Yes! Go to Profile Settings and click 'Preview public profile'. This shows exactly what clients see, even if your profile isn't approved yet. Use this to verify your information before submission.",
    keywords: ["preview", "public", "view", "see", "profile"],
  },
  {
    id: "ac-5",
    category: "account",
    question: "How do I change my email or password?",
    answer: "Currently, email changes require support assistance for security. Contact support@chefmarketplace.com with your request. For password changes, use the 'Forgot Password' link on the login page or contact support.",
    keywords: ["email", "password", "change", "update", "security"],
  },
  // Additional Bookings
  {
    id: "bk-5",
    category: "bookings",
    question: "What if a client cancels a confirmed booking?",
    answer: "If a client cancels, you'll be notified immediately. Cancellation policies vary - check your booking details for specific terms. For disputes about cancellations, contact support with the booking ID for assistance.",
    keywords: ["cancel", "cancellation", "client", "refund", "policy"],
  },
  {
    id: "bk-6",
    category: "bookings",
    question: "Can I decline a booking request?",
    answer: "Yes, you can decline requests through your Messages tab. Simply send a polite message explaining why you can't accommodate the request. Declining doesn't negatively affect your rating if done professionally and promptly.",
    keywords: ["decline", "reject", "cancel", "request", "refuse"],
  },
  // Additional Payments
  {
    id: "pm-5",
    category: "payments",
    question: "How do I handle tips from clients?",
    answer: "Clients can add tips during the payment process. Tips are processed through Stripe and included in your payout. All tips are subject to the same processing timeline as regular payments (24-48 hours after event completion).",
    keywords: ["tip", "gratuity", "extra", "bonus", "payment"],
  },
  // Additional Visibility
  {
    id: "vis-4",
    category: "visibility",
    question: "What is the daily checklist and how does it help?",
    answer: "The daily checklist helps you stay on track with platform best practices: sending quotes, responding to messages, and maintaining your response rate. Completing daily goals improves your marketplace visibility and client engagement.",
    keywords: ["checklist", "daily", "goals", "tasks", "improve"],
  },
]

const categoryConfig: Record<FAQCategory, { label: string; icon: typeof BookOpen; color: string }> = {
  "getting-started": { label: "Getting Started", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
  "bookings": { label: "Bookings", icon: Calendar, color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" },
  "payments": { label: "Payments", icon: DollarSign, color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
  "visibility": { label: "Visibility & Ranking", icon: Users, color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
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
          <p className="text-sm leading-6 text-muted-foreground">Find answers to common questions or reach out to our support team for personalized help.</p>
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
                <Link href="mailto:support@chefmarketplace.com">
                  <Mail className="size-4" />
                  <span>Email support</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-2xl border-white/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Link href="mailto:support@chefmarketplace.com?subject=Chef%20Marketplace%20Help%20Request" target="_blank" rel="noreferrer">
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
                  For urgent issues outside these hours, please email support@chefmarketplace.com and we will respond as soon as possible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
