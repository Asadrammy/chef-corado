"use client"

import * as React from "react"
import {
  Camera,
  Plus,
  Trash2,
  Key,
  ExternalLink,
  Save,
  User,
  Mail,
  Link2,
  Shield,
  Bell,
  Palette,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type SettingsSection = "profile" | "account" | "security" | "notifications" | "appearance"

export function SettingsDashboard() {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("profile")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const tabs = [
    { id: "profile" as const, label: "Profile" },
    { id: "account" as const, label: "Account" },
    { id: "security" as const, label: "Security" },
    { id: "notifications" as const, label: "Notifications" },
    { id: "appearance" as const, label: "Appearance" },
  ]

  return (
    <div className="w-full px-12 py-10 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account, profile, and preferences</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-black text-white rounded-xl px-6 py-2.5 hover:bg-gray-900 transition"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <ProfileOverviewCard />

      <div className="flex gap-8 border-b pb-2 mb-12 text-base font-medium w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={
              activeSection === tab.id
                ? "text-black border-b-2 border-black pb-3 -mb-3 font-semibold transition-all duration-200"
                : "text-gray-500 hover:text-black pb-3 -mb-3 transition-all duration-200"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-8">
          {activeSection === "profile" && <ProfileSection />}
          {activeSection === "account" && <AccountSection />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "appearance" && <AppearanceSection />}
        </div>

        <div className="col-span-4 space-y-10">
          <RightRail />
        </div>
      </div>
    </div>
  )
}

function ProfileOverviewCard() {
  return (
    <Card className="bg-gradient-to-r from-white via-gray-50 to-white border border-white/40 rounded-2xl px-14 py-10 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 mb-12 hover:scale-[1.01]">
      <CardContent className="p-0 relative flex items-center justify-between gap-6">
        <div aria-hidden className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08),transparent_60%)] blur-2xl" />
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-white shadow-md">
            <AvatarFallback className="text-base">JD</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xl font-semibold text-gray-900">John Doe</p>
            <p className="text-sm text-gray-500">john@example.com</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl px-6 py-2.5 hover:bg-gray-100 transition">
          Edit profile
        </Button>
      </CardContent>
    </Card>
  )
}

function ProfileSection() {
  return (
    <div>
      <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-900" />
            Profile
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-base">JD</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">Profile photo</p>
                <p className="text-sm text-gray-500">This will be shown on your profile.</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl px-5 flex items-center gap-2 hover:bg-gray-100 transition">
              <Camera className="h-4 w-4" />
              Edit photo
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-gray-600 font-medium">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">This is your public display name.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-gray-600 font-medium">Username</Label>
              <Input
                id="username"
                placeholder="johndoe"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">Unique identifier for your profile.</p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="bio" className="text-sm text-gray-600 font-medium">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                className="min-h-40 rounded-xl border border-gray-200 bg-white p-4 text-sm resize-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
                rows={5}
              />
              <p className="text-xs text-gray-400">Brief description for your profile. Maximum 200 characters.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-900" />
            Contact
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-600 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">Used for account notifications.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-gray-600 font-medium">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1 (555) 123-4567"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">Optional - for urgent contact.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-gray-900" />
            Social
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm text-gray-600 font-medium">Website</Label>
              <Input
                id="website"
                placeholder="https://yourwebsite.com"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">Personal site or portfolio.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-sm text-gray-600 font-medium">Twitter</Label>
              <Input
                id="twitter"
                placeholder="@username"
                className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:border-black"
              />
              <p className="text-xs text-gray-400">Optional social link.</p>
            </div>
          </div>

          <Button variant="outline" className="rounded-xl px-5 flex items-center gap-2 w-fit hover:bg-gray-100 transition">
            <Plus className="h-4 w-4" />
            Add new URL
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountSection() {
  return (
    <div>
      <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gray-900" />
            Account
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
            <div>
              <p className="font-medium text-gray-900">Change password</p>
              <p className="text-sm text-gray-500">Update your account password.</p>
            </div>
            <Button variant="outline" className="rounded-xl px-5 flex items-center gap-2 hover:bg-gray-100 transition">
              <Key className="h-4 w-4" />
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
            <div>
              <p className="font-medium text-gray-900">Export data</p>
              <p className="text-sm text-gray-500">Download a copy of your data.</p>
            </div>
            <Button variant="outline" className="rounded-xl px-5 flex items-center gap-2 hover:bg-gray-100 transition">
              <ExternalLink className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-red-700">Danger zone</p>
            <p className="text-sm text-red-600 mt-1">Permanently delete your account and all associated data.</p>
          </div>
          <Button className="bg-red-600 text-white hover:bg-red-700 transition rounded-xl px-6 py-2.5 flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-900" />
          Security
        </CardTitle>
        <div className="border-b mb-4" />
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Two-factor authentication</p>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">Enable</Button>
        </div>

        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Active sessions</p>
            <p className="text-sm text-gray-500">View and manage devices logged into your account.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">View</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationsSection() {
  return (
    <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-900" />
          Notifications
        </CardTitle>
        <div className="border-b mb-4" />
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Email notifications</p>
            <p className="text-sm text-gray-500">Receive updates and reminders via email.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">Configure</Button>
        </div>

        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Push notifications</p>
            <p className="text-sm text-gray-500">Browser notifications for real-time updates.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">Configure</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  return (
    <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-2xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 p-12 mb-12 hover:scale-[1.01]">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-medium mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-gray-900" />
          Appearance
        </CardTitle>
        <div className="border-b mb-4" />
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Theme</p>
            <p className="text-sm text-gray-500">Choose your preferred theme.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">Light</Button>
        </div>

        <div className="flex items-center justify-between gap-6 rounded-2xl border p-6">
          <div>
            <p className="font-medium text-gray-900">Language</p>
            <p className="text-sm text-gray-500">Select your language.</p>
          </div>
          <Button variant="outline" className="rounded-xl px-5 hover:bg-gray-100 transition">English</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RightRail() {
  return (
    <>
      <Card className="bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-900" />
            Profile completion
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">72%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full w-[72%] bg-gradient-to-r from-black to-gray-700 rounded-full transition-all duration-500" />
          </div>
          <p className="text-sm text-gray-500">Complete your bio and add social links to improve visibility.</p>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-900" />
            Security status
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Two-factor auth</span>
            <span className="font-medium text-gray-900">Off</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Recent sign-in</span>
            <span className="font-medium text-gray-900">Today</span>
          </div>
          <Button variant="outline" className="rounded-xl w-full hover:bg-gray-100 transition">Review security</Button>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:scale-[1.01]">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-900" />
            Quick actions
          </CardTitle>
          <div className="border-b mb-4" />
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <Button variant="outline" className="rounded-xl w-full hover:bg-gray-100 transition">Update password</Button>
          <Button variant="outline" className="rounded-xl w-full hover:bg-gray-100 transition">Download data</Button>
          <Button variant="outline" className="rounded-xl w-full hover:bg-gray-100 transition">Manage sessions</Button>
        </CardContent>
      </Card>
    </>
  )
}
