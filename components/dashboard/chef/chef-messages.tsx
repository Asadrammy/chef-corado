"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format, formatDistanceToNow } from "date-fns"
import { ArrowLeft, CalendarDays, MapPin, MessageSquare, Send, Sparkles, Wallet } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/currency"
import { COMMUNICATION_POLICY } from "@/lib/request-options"
import { cn } from "@/lib/utils"
import { ProposalStatus, Role } from "@/types"

type ConversationSummary = {
  otherUser: {
    id: string
    name: string | null
    role?: string | null
  }
  lastMessage: {
    id: string
    content: string
    createdAt: string
    proposalId?: string | null
  }
  unreadCount: number
}

type ThreadRequestContext = {
  id: string
  title: string
  eventDate: string
  location: string
  budget: number | null
  currency?: string | null
  details: string | null
}

type ThreadProposal = {
  id: string
  price: number
  currency?: string | null
  message: string
  status: string
  createdAt: string
  expiresAt: string | null
  request: ThreadRequestContext | null
}

type ThreadBooking = {
  id: string
  eventDate: string
  location: string
  totalPrice: number
  currency?: string | null
  status: string
}

type ThreadMessage = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  proposalId?: string | null
  sender: {
    id: string
    name: string | null
    role?: string | null
  }
  receiver: {
    id: string
    name: string | null
    role?: string | null
  }
  proposal: ThreadProposal | null
}

type ThreadResponse = {
  otherUser: {
    id: string
    name: string | null
    role?: string | null
  } | null
  context: {
    request: ThreadRequestContext | null
    activeProposal: ThreadProposal | null
    latestBooking: ThreadBooking | null
  }
  messages: ThreadMessage[]
}

type ChefMessagesProps = {
  initialUserId?: string
}

type QuoteDraft = {
  requestId: string
  proposalId: string
  price: string
  message: string
}

const editableProposalStatuses = new Set<string>([
  ProposalStatus.PENDING,
  ProposalStatus.REJECTED,
  ProposalStatus.EXPIRED,
  ProposalStatus.WITHDRAWN,
])

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function isQuoteEditable(proposal: ThreadProposal | null) {
  return Boolean(proposal && editableProposalStatuses.has(proposal.status))
}

export function ChefMessages({ initialUserId }: ChefMessagesProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const currentUserId = session?.user?.id ?? ""
  const isChef = session?.user?.role === Role.CHEF

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeUserId, setActiveUserId] = useState(initialUserId ?? "")
  const [thread, setThread] = useState<ThreadResponse | null>(null)
  const [threadLoading, setThreadLoading] = useState(Boolean(initialUserId))
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({
    requestId: "",
    proposalId: "",
    price: "",
    message: "",
  })

  const scrollViewportRef = useRef<HTMLDivElement | null>(null)

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.otherUser.id === activeUserId) ?? null,
    [activeUserId, conversations]
  )

  const selectedName = thread?.otherUser?.name ?? selectedConversation?.otherUser.name ?? "Conversation"

  const syncConversationPreview = (message: ThreadMessage) => {
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId
    const otherUser = message.senderId === currentUserId ? message.receiver : message.sender

    setConversations((prev) => {
      const existing = prev.find((item) => item.otherUser.id === otherUserId)
      const unreadCount = message.receiverId === currentUserId && activeUserId !== otherUserId
        ? (existing?.unreadCount ?? 0) + 1
        : existing?.unreadCount ?? 0

      const nextConversation: ConversationSummary = {
        otherUser: {
          id: otherUserId,
          name: otherUser.name,
          role: otherUser.role,
        },
        lastMessage: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          proposalId: message.proposalId,
        },
        unreadCount: activeUserId === otherUserId ? 0 : unreadCount,
      }

      return [nextConversation, ...prev.filter((item) => item.otherUser.id !== otherUserId)]
    })
  }

  const fetchConversations = async () => {
    if (!currentUserId) {
      setConversationsLoading(false)
      return
    }

    try {
      setConversationsLoading(true)
      const response = await fetch("/api/messages/conversations", {
        cache: "no-store",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch conversations")
      }

      const data = (await response.json()) as ConversationSummary[]
      setConversations(data)

      if (!activeUserId && data.length > 0 && !initialUserId) {
        setActiveUserId(data[0].otherUser.id)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load conversations")
    } finally {
      setConversationsLoading(false)
    }
  }

  const fetchThread = async (userId: string) => {
    if (!userId) return

    try {
      setThreadLoading(true)
      const response = await fetch(`/api/messages?otherUserId=${userId}`, {
        cache: "no-store",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch conversation")
      }

      const payload = await response.json()
      const data = (payload.data ?? payload) as ThreadResponse
      setThread(data)

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.otherUser.id === userId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      )

      const proposal = data.context.activeProposal
      const request = proposal?.request ?? data.context.request
      setQuoteDraft({
        requestId: request?.id ?? "",
        proposalId: proposal?.id ?? "",
        price: proposal ? String(proposal.price) : "",
        message: proposal?.message ?? "",
      })
    } catch (error) {
      console.error(error)
      toast.error("Failed to load conversation")
    } finally {
      setThreadLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations()
    }
  }, [status, currentUserId])

  useEffect(() => {
    if (status === "authenticated" && activeUserId) {
      fetchThread(activeUserId)
    }
  }, [status, activeUserId])

  useEffect(() => {
    const viewport = scrollViewportRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [thread?.messages])

  useEffect(() => {
    if (!initialUserId || activeUserId === initialUserId) return
    if (!activeUserId) return
    router.replace(`/dashboard/chef/messages/${activeUserId}`)
  }, [activeUserId, initialUserId, router])

  const openConversation = (userId: string) => {
    setActiveUserId(userId)
    router.push(`/dashboard/chef/messages/${userId}`)
  }

  const handleSendMessage = async () => {
    if (!draft.trim() || !activeUserId) return

    setSending(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: activeUserId,
          content: draft.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const payload = await response.json()
      const nextMessage = payload.data ?? payload
      const normalizedMessage: ThreadMessage = {
        ...nextMessage,
        createdAt: typeof nextMessage.createdAt === "string" ? nextMessage.createdAt : new Date(nextMessage.createdAt).toISOString(),
        proposal: null,
      }

      setThread((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: [...prev.messages, normalizedMessage],
        }
      })
      syncConversationPreview(normalizedMessage)
      setDraft("")
    } catch (error) {
      console.error(error)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleSubmitQuote = async () => {
    if (!activeUserId) return
    if (!quoteDraft.price.trim() || !quoteDraft.message.trim()) {
      toast.error("Price and quote message are required")
      return
    }

    const hasProposal = Boolean(quoteDraft.proposalId)
    if (!hasProposal && !quoteDraft.requestId) {
      toast.error("A request context is required before sending a quote")
      return
    }

    setQuoteSubmitting(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          hasProposal
            ? {
                action: "quote:update",
                receiverId: activeUserId,
                proposalId: quoteDraft.proposalId,
                price: Number(quoteDraft.price),
                message: quoteDraft.message.trim(),
              }
            : {
                action: "quote:create",
                receiverId: activeUserId,
                requestId: quoteDraft.requestId,
                price: Number(quoteDraft.price),
                message: quoteDraft.message.trim(),
              }
        ),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const errorMessage = payload?.error || "Failed to send quote"
        throw new Error(errorMessage)
      }

      toast.success(hasProposal ? "Quote updated and resent" : "Quote sent")
      setQuoteOpen(false)
      await Promise.all([fetchThread(activeUserId), fetchConversations()])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to send quote")
    } finally {
      setQuoteSubmitting(false)
    }
  }

  if (status === "loading") {
    return <div className="py-8 text-sm text-muted-foreground">Loading messages...</div>
  }

  if (!isChef) {
    return <div className="py-8 text-sm text-muted-foreground">Chef access is required to view messages.</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.9))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
              <MessageSquare className="size-3.5" />
              Client messenger
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Messages</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage client conversations, review request context, and send updated quotes without leaving your dashboard.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{COMMUNICATION_POLICY}</p>
          </div>
          {activeUserId && thread?.context.request && (
            <Button type="button" variant="outline" className="rounded-2xl border-white/70 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5" onClick={() => setQuoteOpen(true)}>
              <Wallet className="mr-2 size-4" />
              {isQuoteEditable(thread.context.activeProposal) ? "Update Quote" : "Send Quote"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className={cn("overflow-hidden rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5", activeUserId ? "hidden lg:block" : "block")}>
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="size-5" />
              Inbox
            </CardTitle>
            <CardDescription>Latest client conversations and unread replies.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[720px]">
              <div className="divide-y divide-border/50">
                {conversationsLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : conversations.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
                    <MessageSquare className="size-10 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No conversations yet</p>
                      <p className="text-sm text-muted-foreground">New client messages and booking discussions will appear here.</p>
                    </div>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.otherUser.id}
                      type="button"
                      onClick={() => openConversation(conversation.otherUser.id)}
                      className={cn(
                        "flex w-full items-start gap-3 p-4 text-left transition-all duration-200 hover:bg-white/70 dark:hover:bg-white/5",
                        conversation.otherUser.id === activeUserId && "bg-primary/8"
                      )}
                    >
                      <Avatar className="size-11 border border-white/60 shadow-sm dark:border-white/10">
                        <AvatarFallback>{getInitials(conversation.otherUser.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-foreground">{conversation.otherUser.name ?? "Client"}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{conversation.lastMessage.content}</p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge className="rounded-full bg-primary px-2.5 py-1 text-[11px] shadow-sm">{conversation.unreadCount}</Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className={cn("rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5", !activeUserId ? "hidden lg:flex" : "flex", "min-h-[720px] flex-col overflow-hidden")}>
          {activeUserId ? (
            <>
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => router.push("/dashboard/chef/messages")}>
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Avatar className="size-11 border border-white/60 shadow-sm dark:border-white/10">
                      <AvatarFallback>{getInitials(selectedName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedName}</CardTitle>
                      <CardDescription>
                        {thread?.otherUser?.role === Role.CLIENT ? "Client conversation" : "Marketplace conversation"}
                      </CardDescription>
                    </div>
                  </div>
                  {thread?.context.activeProposal && (
                    <Badge variant="secondary" className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-primary shadow-sm">
                      Quote {thread.context.activeProposal.status.toLowerCase().replaceAll("_", " ")}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {threadLoading ? (
                  <div className="space-y-4 p-6">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-20 w-3/4 rounded-xl" />
                    <Skeleton className="ml-auto h-20 w-2/3 rounded-xl" />
                  </div>
                ) : (
                  <>
                    {(thread?.context.request || thread?.context.latestBooking || thread?.context.activeProposal) && (
                      <div className="border-b border-border/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0))] p-5 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                          {thread?.context.request && (
                            <div className="rounded-[24px] border border-white/60 bg-white/65 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Sparkles className="size-4" />
                                Request context
                              </div>
                              <p className="mt-2 text-base font-semibold text-foreground">{thread.context.request.title}</p>
                              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="size-4" />
                                  {format(new Date(thread.context.request.eventDate), "MMM d, yyyy")}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="size-4" />
                                  {thread.context.request.location}
                                </span>
                              </div>
                              {thread.context.request.details && (
                                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{thread.context.request.details}</p>
                              )}
                            </div>
                          )}

                          {(thread?.context.activeProposal || thread?.context.latestBooking) && (
                            <div className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                              {thread?.context.activeProposal && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-foreground">Latest quote</p>
                                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">{thread.context.activeProposal.status}</Badge>
                                  </div>
                                  <p className="text-2xl font-bold text-foreground">{formatCurrency(thread.context.activeProposal.price, thread.context.activeProposal.currency || "GBP")}</p>
                                  <p className="line-clamp-3 text-sm text-muted-foreground">{thread.context.activeProposal.message}</p>
                                </div>
                              )}
                              {thread?.context.latestBooking && (
                                <>
                                  {thread?.context.activeProposal && <Separator className="my-4" />}
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">Booking linked</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(thread.context.latestBooking.eventDate), "MMM d, yyyy")} · {thread.context.latestBooking.location}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatCurrency(thread.context.latestBooking.totalPrice, thread.context.latestBooking.currency || "GBP")} · {thread.context.latestBooking.status}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <ScrollArea ref={scrollViewportRef} className="flex-1 bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,0))] px-5 py-5 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
                      <div className="space-y-5">
                        {thread?.messages.length ? (
                          thread.messages.map((message) => {
                            const isMine = message.senderId === currentUserId
                            return (
                              <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                                <div className={cn("max-w-[82%] space-y-2", isMine && "items-end")}>
                                  <div
                                    className={cn(
                                      "rounded-[24px] px-4 py-3 shadow-sm",
                                      isMine
                                        ? "brand-gradient-button shadow-lg shadow-primary/20"
                                        : "border border-white/60 bg-white/78 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/6"
                                    )}
                                  >
                                    <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                                    <p className={cn("mt-2 text-[11px]", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                      {format(new Date(message.createdAt), "MMM d · h:mm a")}
                                    </p>
                                  </div>

                                  {message.proposal && (
                                    <div className="rounded-[24px] border border-primary/15 bg-[linear-gradient(180deg,rgba(99,102,241,0.07),rgba(255,255,255,0.96))] p-4 shadow-sm dark:bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))]">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">Quote for {message.proposal.request?.title ?? "request"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {message.proposal.expiresAt ? `Expires ${formatDistanceToNow(new Date(message.proposal.expiresAt), { addSuffix: true })}` : "No expiry set"}
                                          </p>
                                        </div>
                                        <Badge variant="secondary" className="rounded-full border border-primary/15 bg-primary/10 text-primary">{message.proposal.status}</Badge>
                                      </div>
                                      <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(message.proposal.price, message.proposal.currency || "GBP")}</p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{message.proposal.message}</p>
                                      {isMine && isQuoteEditable(message.proposal) && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="mt-4 rounded-xl"
                                          onClick={() => {
                                            setQuoteDraft({
                                              requestId: message.proposal?.request?.id ?? "",
                                              proposalId: message.proposal?.id ?? "",
                                              price: String(message.proposal?.price ?? ""),
                                              message: message.proposal?.message ?? "",
                                            })
                                            setQuoteOpen(true)
                                          }}
                                        >
                                          Update and resend quote
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-muted-foreground">
                            Start the conversation with a client message or send a quote from the request context.
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="sticky bottom-0 border-t border-border/40 bg-white/82 p-4 backdrop-blur-xl dark:bg-slate-950/70">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">{COMMUNICATION_POLICY}</p>
                      <div className="flex gap-3 rounded-[24px] border border-white/60 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <Input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder="Type your reply..."
                          maxLength={1000}
                          disabled={sending}
                          className="h-12 rounded-2xl border-0 bg-transparent shadow-none focus-visible:ring-0"
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault()
                              void handleSendMessage()
                            }
                          }}
                        />
                        <Button type="button" className="h-12 rounded-2xl px-5 shadow-lg shadow-primary/20" disabled={sending || !draft.trim()} onClick={() => void handleSendMessage()}>
                          <Send className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex h-full min-h-[720px] items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <MessageSquare className="mx-auto size-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">Select a conversation</p>
                  <p className="text-sm text-muted-foreground">Choose a client from your inbox to view messages, request context, and quote history.</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Sheet open={quoteOpen} onOpenChange={setQuoteOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{quoteDraft.proposalId ? "Update quote" : "Send quote"}</SheetTitle>
            <SheetDescription>
              {thread?.context.request
                ? `Quote for ${thread.context.request.title}`
                : "Create a quote tied to the current request context."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
            {thread?.context.request && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{thread.context.request.title}</p>
                <p className="mt-1">{format(new Date(thread.context.request.eventDate), "MMM d, yyyy")} · {thread.context.request.location}</p>
                {thread.context.request.budget ? <p className="mt-1">Client budget: {formatCurrency(thread.context.request.budget, thread.context.request.currency || "GBP")}</p> : null}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quote-price">Quote price</Label>
              <Input
                id="quote-price"
                inputMode="decimal"
                value={quoteDraft.price}
                onChange={(event) => setQuoteDraft((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="250"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-message">Quote details</Label>
              <Textarea
                id="quote-message"
                value={quoteDraft.message}
                onChange={(event) => setQuoteDraft((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Outline the menu, inclusions, timing, and any assumptions for the client."
                className="min-h-40 rounded-xl"
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setQuoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={quoteSubmitting} onClick={() => void handleSubmitQuote()}>
              {quoteSubmitting ? "Sending..." : quoteDraft.proposalId ? "Update quote" : "Send quote"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground lg:hidden">
        <p className="font-medium text-foreground">Need a wider view?</p>
        <p className="mt-1">Open a thread to focus on one client at a time, or return to the inbox for your full conversation list.</p>
      </div>

      {!initialUserId && activeUserId && (
        <div className="hidden">
          <Link href={`/dashboard/chef/messages/${activeUserId}`}>Open active thread</Link>
        </div>
      )}
    </div>
  )
}
