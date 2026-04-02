import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { FileText, ArrowRight } from "lucide-react"
import Link from "next/link"

export type RequestRow = {
  id: string
  eventDate: string
  location: string
  budget: number
  status?: string
}

export function RequestTable({ data }: { data: RequestRow[] }) {
  if (!data.length) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
        <p className="text-muted-foreground mb-4">
          Start by creating your first event request to get proposals from chefs.
        </p>
        <Link href="/dashboard/client/create-request">
          <Button>
            Create Your First Request <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((request) => (
          <TableRow key={request.id}>
            <TableCell>{format(new Date(request.eventDate), "MMM d, yyyy")}</TableCell>
            <TableCell>{request.location}</TableCell>
            <TableCell>${request.budget.toFixed(2)}</TableCell>
            <TableCell>{request.status ?? "Pending"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
