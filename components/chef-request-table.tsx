import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/currency"
import { getServiceTypeLabel } from "@/lib/request-options"

export type ChefRequestRow = {
  id: string
  title?: string | null
  eventType?: string | null
  requestMode?: string | null
  serviceType?: string | null
  serviceTypeLabel?: string | null
  serviceTier?: string | null
  eventDate: string
  createdAt?: string | null
  submittedAt?: string | null
  multiDayDates?: Array<unknown>
  location: string
  budget: number
  currency: string
  details: string | null
  clientName?: string | null
  clientGreetingName?: string | null
  guestCount?: number | null
  adultCount?: number | null
  childrenUnder10?: number | null
  actualAttendeeCount?: number | null
  billableGuestCount?: number | null
  pricingGuestCount?: number | null
  cuisinePreferences?: string[]
  dietaryRequirements?: string[]
  serviceSpecificAnswerSummary?: string[]
  distanceKm?: number
  broaderMatching?: boolean
  geocodingStatus?: string | null
  photos?: Array<{
    id: string
    url: string
    originalName: string | null
  }>
}

export function ChefRequestTable({
  data,
  onSendProposal,
  activeRequestId,
}: {
  data: ChefRequestRow[]
  onSendProposal?: (requestId: string) => void
  activeRequestId?: string | null
}) {
  if (!data.length) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No requests available</h3>
        <p className="text-muted-foreground mb-4">
          There are no client requests in your service area at the moment.
        </p>
        <Link href="/dashboard/chef/profile">
          <Button variant="outline">
            Update Your Profile <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          Expanding your service radius may help you see more requests.
        </p>
      </div>
    )
  }

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead>Event Date</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">
              {format(new Date(request.eventDate), "MMM d, yyyy")}
            </TableCell>
            <TableCell>{request.eventType ?? "Event"}</TableCell>
            <TableCell>{getServiceTypeLabel(request.serviceType, request.serviceTypeLabel)}</TableCell>
            <TableCell>{request.location}</TableCell>
            <TableCell>{formatCurrency(request.budget, request.currency)}</TableCell>
            <TableCell>{request.details ?? "No additional info"}</TableCell>
            <TableCell className="text-right">
              <Button
                variant={request.id === activeRequestId ? "ghost" : "secondary"}
                size="sm"
                onClick={() => onSendProposal?.(request.id)}
              >
                {request.id === activeRequestId ? "Selection active" : "Send Proposal"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
