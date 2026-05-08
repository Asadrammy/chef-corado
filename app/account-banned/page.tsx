import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AlertCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { signOut } from "next-auth/react"

export const metadata: Metadata = generateMeta({
  title: "Account Banned",
  description: "Your account has been suspended",
})

export default async function AccountBannedPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Account Banned
            </h1>
            
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <p>
                Your account has been suspended due to a violation of our platform terms and conditions.
              </p>
              <p className="text-sm">
                If you believe this is an error, or if you have questions about your account status, 
                please contact our support team for assistance.
              </p>
            </div>

            {/* Contact Info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Mail className="w-4 h-4 shrink-0" />
                <span>support@chefplatform.com</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <form
              action={async () => {
                "use server"
                // Sign out the user
                await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signout`, {
                  method: "POST",
                })
              }}
            >
              <Button className="w-full" type="submit">
                Sign Out
              </Button>
            </form>
            
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          © {new Date().getFullYear()} Chef Platform. All rights reserved.
        </p>
      </div>
    </div>
  )
}
