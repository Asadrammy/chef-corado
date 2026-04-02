"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, DollarSign, Calendar, User, ChefHat } from "lucide-react"

interface Payment {
  id: string
  totalAmount: number
  commissionAmount: number
  chefAmount: number
  status: "PENDING" | "HELD" | "RELEASED" | "COMPLETED"
  stripePaymentIntentId?: string
  createdAt: string
  updatedAt: string
  booking: {
    id: string
    totalPrice: number
    status: string
    createdAt: string
    client: {
      name: string
      email: string
    }
    chef: {
      user: {
        name: string
        email: string
      }
    }
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/admin/payments")
      if (!response.ok) {
        throw new Error("Failed to fetch payments")
      }
      const data = await response.json()
      setPayments(data)
    } catch (err) {
      setError("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const handleReleasePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to release this payment to the chef?")) {
      return
    }

    setActionLoading(paymentId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/release`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to release payment")
      }

      setSuccess("Payment released successfully")
      fetchPayments()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to release payment")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "bg-yellow-100 text-yellow-800",
      HELD: "bg-orange-100 text-orange-800",
      RELEASED: "bg-green-100 text-green-800",
      COMPLETED: "bg-blue-100 text-blue-800",
    } as const

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    )
  }

  const canRelease = (payment: Payment) => {
    return payment.status === "HELD" || payment.status === "PENDING"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">
          Monitor and release payments to chefs
        </p>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Held</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payments
                .filter(p => p.status === "HELD" || p.status === "PENDING")
                .reduce((sum, p) => sum + p.totalAmount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === "HELD" || p.status === "PENDING").length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payments
                .filter(p => p.status === "RELEASED" || p.status === "COMPLETED")
                .reduce((sum, p) => sum + p.totalAmount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === "RELEASED" || p.status === "COMPLETED").length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${payments.reduce((sum, p) => sum + p.commissionAmount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {payments.length} total bookings
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            Manage payment status and release funds to chefs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Chef</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">#{payment.booking.id.slice(-8)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.booking.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{payment.booking.client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.booking.client.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <ChefHat className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{payment.booking.chef.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.booking.chef.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${payment.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: ${payment.booking?.totalPrice?.toFixed(2) || '0.00'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-blue-600">
                        ${payment.commissionAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.booking?.totalPrice ? 
                          ((payment.commissionAmount || 0) / payment.booking.totalPrice * 100).toFixed(1) 
                          : '0.0'}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canRelease(payment) && (
                        <Button
                          size="sm"
                          onClick={() => handleReleasePayment(payment.id)}
                          disabled={actionLoading === payment.id}
                        >
                          {actionLoading === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Release"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
