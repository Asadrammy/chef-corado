"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Check, X, Eye, MapPin } from "lucide-react"

interface ChefProfile {
  id: string
  bio?: string
  experience?: number
  location: string
  radius: number
  isApproved: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  _count: {
    menus: number
    bookings: number
  }
}

export default function AdminChefsPage() {
  const [chefs, setChefs] = useState<ChefProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchChefs()
  }, [])

  const fetchChefs = async () => {
    try {
      const response = await fetch("/api/admin/chefs")
      if (!response.ok) {
        throw new Error("Failed to fetch chefs")
      }
      const data = await response.json()
      setChefs(data)
    } catch (err) {
      setError("Failed to load chefs")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (chefId: string) => {
    setActionLoading(chefId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/chefs/${chefId}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to approve chef")
      }

      setSuccess("Chef approved successfully")
      fetchChefs()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to approve chef")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (chefId: string) => {
    if (!confirm("Are you sure you want to reject this chef? This will remove their profile.")) {
      return
    }

    setActionLoading(chefId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/chefs/${chefId}/reject`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to reject chef")
      }

      setSuccess("Chef rejected successfully")
      fetchChefs()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to reject chef")
    } finally {
      setActionLoading(null)
    }
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
        <h1 className="text-3xl font-bold">Chef Management</h1>
        <p className="text-muted-foreground">
          Review and manage chef applications and profiles
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

      <Card>
        <CardHeader>
          <CardTitle>Chef Applications</CardTitle>
          <CardDescription>
            Review pending chef applications and manage existing chefs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chefs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No chef profiles found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chef</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Menus</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chefs.map((chef) => (
                  <TableRow key={chef.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{chef.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {chef.user.email}
                        </div>
                        {chef.bio && (
                          <div className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                            {chef.bio}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{chef.location}</div>
                          <div className="text-sm text-muted-foreground">
                            {chef.radius}km radius
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {chef.experience ? `${chef.experience} years` : "Not specified"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {chef._count.menus} menus
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {chef._count.bookings} bookings
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={chef.isApproved ? "default" : "secondary"}
                        className={
                          chef.isApproved
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {chef.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!chef.isApproved && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(chef.id)}
                              disabled={actionLoading === chef.id}
                            >
                              {actionLoading === chef.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(chef.id)}
                              disabled={actionLoading === chef.id}
                            >
                              {actionLoading === chef.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/dashboard/chef/profile`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
