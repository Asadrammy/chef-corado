import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function ClientInvoicesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  const clientBookings = await prisma.booking.findMany({
    where: { clientId: session.user.id },
    select: { id: true },
  })
  const visibleReceipts = await prisma.invoice.findMany({
    where: {
      bookingId: { in: clientBookings.map((booking) => booking.id) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Receipts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Payment receipts for completed checkout payments. These marketplace payment summaries do not replace any formal chef tax invoice that a chef may need to issue independently.
        </p>
      </header>

      {visibleReceipts.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No receipts are available yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleReceipts.map((receipt) => (
            <Card key={receipt.id} className="rounded-lg print:break-inside-avoid">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{receipt.invoiceNumber}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">Booking {receipt.bookingId}</p>
                </div>
                <Badge>{receipt.status.replace(/_/g, " ")}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Recipient:</span> {receipt.recipientName ?? "Not recorded"}</p>
                  <p><span className="text-muted-foreground">Paid:</span> {receipt.paidAt ? receipt.paidAt.toLocaleDateString() : "Not recorded"}</p>
                  <p><span className="text-muted-foreground">Subtotal:</span> {formatCurrency(receipt.subtotalAmount, receipt.currency)}</p>
                  <p><span className="text-muted-foreground">Tax:</span> {receipt.taxAmount > 0 ? formatCurrency(receipt.taxAmount, receipt.currency) : "Not configured"}</p>
                  <p className="font-semibold"><span className="text-muted-foreground">Total:</span> {formatCurrency(receipt.totalAmount, receipt.currency)}</p>
                </div>
                <p className="text-xs text-muted-foreground print:hidden">Use your browser print command to save or print this receipt.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
