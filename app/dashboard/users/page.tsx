"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircledIcon } from "@radix-ui/react-icons"
import UsersDataTable, { type User } from "./data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function Page() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function getUsers() {
      if (status === "loading") return
      
      try {
        const response = await fetch("/api/users", {
          cache: "no-store",
        })

        if (!response.ok) {
          if (response.status === 401) {
            setError("You must be an admin to view users")
          } else if (response.status === 403) {
            setError("Admin access required")
          } else {
            setError(`Failed to load users: ${response.status}`)
          }
          return
        }

        const data = await response.json()
        setUsers(data)
      } catch (err) {
        setError("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    getUsers()
  }, [status])

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <Alert>
        <AlertDescription>
          Please log in to view users.
        </AlertDescription>
      </Alert>
    )
  }

  if (session.user?.role !== "ADMIN") {
    return (
      <Alert>
        <AlertDescription>
          You must be an admin to view users.
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Button variant="secondary" asChild>
          <Link href="#">
            <PlusCircledIcon /> Add New User
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent>
          <UsersDataTable data={users} />
        </CardContent>
      </Card>
    </>
  )
}
