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
      <div className="rounded-[28px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
            <FileText className="h-9 w-9" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">No requests yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start by creating your first event request to receive chef proposals.
          </p>
          <Link href="/dashboard/client/create-request" className="mt-6">
            <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
              Create Your First Request
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
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
