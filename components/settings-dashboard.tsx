"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  Camera,
  Loader2,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { MENU_IMAGE_ALLOWED_TYPES, MENU_IMAGE_MAX_BYTES } from "@/lib/menu-image-storage"

type SettingsSection = "profile" | "account" | "security" | "notifications" | "appearance"

const tabs = [
  { id: "profile" as const, label: "Profile" },
  { id: "account" as const, label: "Account" },
  { id: "security" as const, label: "Security" },
  { id: "notifications" as const, label: "Notifications" },
  { id: "appearance" as const, label: "Appearance" },
]

type InitialProfile = {
  name: string
  email: string
  username: string | null
  bio: string | null
  phone: string | null
  website: string | null
  socialProfile: string | null
  image: string | null
  profileCompletion: number
} | null

export function SettingsDashboard({ initialProfile = null }: { initialProfile?: InitialProfile }) {
  const { data: session, update } = useSession()
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("profile")
  const [profileDetails, setProfileDetails] = React.useState({
    name: initialProfile?.name ?? session?.user?.name ?? "",
    email: initialProfile?.email ?? session?.user?.email ?? "",
    username: initialProfile?.username ?? "",
    bio: initialProfile?.bio ?? "",
    phone: initialProfile?.phone ?? "",
    website: initialProfile?.website ?? "",
    socialProfile: initialProfile?.socialProfile ?? "",
  })
  const [profileImage, setProfileImage] = React.useState<string | null>(initialProfile?.image ?? session?.user?.image ?? null)
  const [profileCompletion, setProfileCompletion] = React.useState(initialProfile?.profileCompletion ?? 0)
  const displayName = profileDetails.name || "ChefaChef member"
  const displayEmail = profileDetails.email || "Email unavailable"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CC"
  const profileHref = session?.user?.role === "CHEF" ? "/dashboard/chef/profile" : "/dashboard/settings/account"

  React.useEffect(() => {
    setProfileImage(initialProfile?.image ?? session?.user?.image ?? null)
  }, [initialProfile?.image, session?.user?.image])

  React.useEffect(() => {
    setProfileDetails({
      name: initialProfile?.name ?? session?.user?.name ?? "",
      email: initialProfile?.email ?? session?.user?.email ?? "",
      username: initialProfile?.username ?? "",
      bio: initialProfile?.bio ?? "",
      phone: initialProfile?.phone ?? "",
      website: initialProfile?.website ?? "",
      socialProfile: initialProfile?.socialProfile ?? "",
    })
  }, [initialProfile, session?.user?.email, session?.user?.name])

  const handleProfileImageUpdated = React.useCallback(
    async (image: string, nextProfileCompletion?: number) => {
      setProfileImage(image)
      if (typeof nextProfileCompletion === "number") {
        setProfileCompletion(nextProfileCompletion)
      }
      await update({ user: { image } })
    },
    [update]
  )

  return (
    <div className="w-full pb-10">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account, profile, and preferences.</p>
          </div>
          <Button asChild className="brand-gradient-button h-10 rounded-lg px-4 shadow-sm">
            <Link href={profileHref}>
            <Save className="mr-2 h-4 w-4" />
            Manage Profile
            </Link>
          </Button>
        </div>

        <ProfileOverviewCard
          displayName={displayName}
          displayEmail={displayEmail}
          initials={initials}
          profileHref={profileHref}
          profileImage={profileImage}
        />

        <Tabs
          value={activeSection}
          onValueChange={(value) => setActiveSection(value as SettingsSection)}
          className="gap-6"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto w-full min-w-max justify-start rounded-none border-b border-border bg-transparent p-0 text-foreground">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-10 rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-1.5 py-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-3"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 xl:col-span-8">
              <TabsContent value="profile" className="mt-0">
                <ProfileSection
                  profileDetails={profileDetails}
                  initials={initials}
                  profileImage={profileImage}
                  onProfileSaved={async (nextProfile) => {
                    setProfileDetails({
                      name: nextProfile.name ?? "",
                      email: nextProfile.email ?? profileDetails.email,
                      username: nextProfile.username ?? "",
                      bio: nextProfile.bio ?? "",
                      phone: nextProfile.phone ?? "",
                      website: nextProfile.website ?? "",
                      socialProfile: nextProfile.socialProfile ?? "",
                    })
                    await update({ user: { name: nextProfile.name } })
                  }}
                  onProfileImageUpdated={handleProfileImageUpdated}
                />
              </TabsContent>
              <TabsContent value="account" className="mt-0">
                <AccountSection />
              </TabsContent>
              <TabsContent value="security" className="mt-0">
                <SecuritySection />
              </TabsContent>
              <TabsContent value="notifications" className="mt-0">
                <NotificationsSection />
              </TabsContent>
              <TabsContent value="appearance" className="mt-0">
                <AppearanceSection />
              </TabsContent>
            </div>

            <div className="lg:col-span-4 xl:col-span-4">
              <div className="lg:sticky lg:top-6">
                <RightRail profileCompletion={profileCompletion} />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

function ProfileOverviewCard({
  displayName,
  displayEmail,
  initials,
  profileHref,
  profileImage,
}: {
  displayName: string
  displayEmail: string
  initials: string
  profileHref: string
  profileImage?: string | null
}) {
  return (
    <Card className="rounded-xl border-border/60 bg-background shadow-sm">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border/60">
            <AvatarImage src={profileImage ?? undefined} alt={`${displayName} profile photo`} />
            <AvatarFallback className="bg-muted text-sm font-medium text-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            <p className="text-sm text-muted-foreground">{displayEmail}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-10 rounded-lg px-4">
          <Link href={profileHref}>
          Edit profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function ProfileSection({
  profileDetails,
  initials,
  profileImage,
  onProfileSaved,
  onProfileImageUpdated,
}: {
  profileDetails: {
    name: string
    email: string
    username: string
    bio: string
    phone: string
    website: string
    socialProfile: string
  }
  initials: string
  profileImage?: string | null
  onProfileSaved: (profile: any) => Promise<void>
  onProfileImageUpdated: (image: string, profileCompletion?: number) => Promise<void>
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [formData, setFormData] = React.useState(profileDetails)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileError, setProfileError] = React.useState("")
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false)
  const [photoError, setPhotoError] = React.useState("")

  React.useEffect(() => {
    setFormData(profileDetails)
  }, [profileDetails])

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username || null,
          bio: formData.bio || null,
          phone: formData.phone || null,
          website: formData.website || null,
          socialProfile: formData.socialProfile || null,
        }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save profile. Please try again.")
      }

      await onProfileSaved(result.user)
      toast.success("Profile saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save profile. Please try again."
      setProfileError(message)
      toast.error(message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleEditPhotoClick = () => {
    if (uploadingPhoto) return
    setPhotoError("")
    fileInputRef.current?.click()
  }

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!MENU_IMAGE_ALLOWED_TYPES.includes(file.type as typeof MENU_IMAGE_ALLOWED_TYPES[number])) {
      const message = "Invalid file type. Only JPEG, PNG, and WebP are allowed."
      setPhotoError(message)
      toast.error(message)
      event.target.value = ""
      return
    }

    if (file.size > MENU_IMAGE_MAX_BYTES) {
      const message = "File too large. Maximum size is 5MB."
      setPhotoError(message)
      toast.error(message)
      event.target.value = ""
      return
    }

    setUploadingPhoto(true)
    setPhotoError("")

    try {
      const payload = new FormData()
      payload.append("file", file)

      const response = await fetch("/api/user/profile-photo", {
        method: "POST",
        body: payload,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to update profile photo. Please try again.")
      }

      if (!result?.image || typeof result.image !== "string") {
        throw new Error("Unable to update profile photo. Please try again.")
      }

      await onProfileImageUpdated(result.image, result.user?.profileCompletion)
      toast.success("Profile photo updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile photo. Please try again."
      setPhotoError(message)
      toast.error(message)
    } finally {
      setUploadingPhoto(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your public identity and personal summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <Separator />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-border/60">
                <AvatarImage src={profileImage ?? undefined} alt={`${formData.name || "ChefaChef member"} profile photo`} />
                <AvatarFallback className="bg-muted text-sm font-medium text-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Profile photo</p>
                <p className="text-sm text-muted-foreground">This will be shown on your profile.</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="h-10 rounded-lg px-4" onClick={handleEditPhotoClick} disabled={uploadingPhoto}>
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploadingPhoto ? "Uploading..." : "Edit photo"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelected}
              disabled={uploadingPhoto}
            />
          </div>
          {photoError ? <p className="text-sm text-destructive" role="alert">{photoError}</p> : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your display name" className="h-11 rounded-lg" />
                <p className="text-xs text-muted-foreground">This is your public display name.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={formData.username} onChange={(event) => updateField("username", event.target.value)} placeholder="your-chefachef-name" className="h-11 rounded-lg" />
                <p className="text-xs text-muted-foreground">Unique identifier for your profile.</p>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(event) => updateField("bio", event.target.value)} placeholder="Tell us about yourself..." className="min-h-32 rounded-lg" rows={5} />
              <p className="text-xs text-muted-foreground">Brief description for your profile. Maximum 200 characters.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Mail className="h-5 w-5" />
            Contact
          </CardTitle>
          <CardDescription>Manage how people and the platform can reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <Separator />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                placeholder="your.email@example.com"
                className="h-11 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">Used for account notifications.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+44 07942 641878"
                className="h-11 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">Optional for urgent contact.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Link2 className="h-5 w-5" />
            Social
          </CardTitle>
          <CardDescription>Add links that help people learn more about you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <Separator />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={formData.website} onChange={(event) => updateField("website", event.target.value)} placeholder="https://your-site.example" className="h-11 rounded-lg" />
              <p className="text-xs text-muted-foreground">Personal site or portfolio.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="socialProfile">Social profile</Label>
              <Input id="socialProfile" value={formData.socialProfile} onChange={(event) => updateField("socialProfile", event.target.value)} placeholder="Approved public profile URL" className="h-11 rounded-lg" />
              <p className="text-xs text-muted-foreground">Optional social link.</p>
            </div>
          </div>

          {profileError ? <p className="text-sm text-destructive" role="alert">{profileError}</p> : null}
          <Button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="h-10 w-fit rounded-lg px-4">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingProfile ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountSection() {
  return (
    <div className="space-y-8">
      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Control account access, exports, and ownership actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6 sm:p-8">
          <Separator />
          <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Change password</p>
              <p className="text-sm text-muted-foreground">Update your account password.</p>
            </div>
            <Button variant="outline" className="h-10 rounded-lg px-4">
              <Key className="h-4 w-4" />
              Change
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Export data</p>
              <p className="text-sm text-muted-foreground">Download a copy of your data.</p>
            </div>
            <Button variant="outline" className="h-10 rounded-lg px-4">
              <ExternalLink className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/20 bg-destructive/5 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Danger zone</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
            </div>
            <Button variant="destructive" className="h-10 rounded-lg px-4 shadow-sm">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SecuritySection() {
  return (
    <Card className="rounded-xl border-border/60 bg-background shadow-sm">
      <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>Review how your account is protected and where it is active.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8">
        <Separator />
        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Two-factor authentication</p>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">Enable</Button>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Active sessions</p>
            <p className="text-sm text-muted-foreground">View and manage devices logged into your account.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">View</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationsSection() {
  return (
    <Card className="rounded-xl border-border/60 bg-background shadow-sm">
      <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>Choose how you want to receive updates and reminders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8">
        <Separator />
        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Email notifications</p>
            <p className="text-sm text-muted-foreground">Receive updates and reminders via email.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">Configure</Button>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Push notifications</p>
            <p className="text-sm text-muted-foreground">Browser notifications for real-time updates.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">Configure</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  return (
    <Card className="rounded-xl border-border/60 bg-background shadow-sm">
      <CardHeader className="p-6 pb-0 sm:p-8 sm:pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
        <CardDescription>Personalize how your workspace looks and feels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8">
        <Separator />
        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">Light</Button>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Language</p>
            <p className="text-sm text-muted-foreground">Select your language.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-lg px-4">English</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RightRail({ profileCompletion }: { profileCompletion: number }) {
  const safeProfileCompletion = Math.max(0, Math.min(100, Math.round(profileCompletion)))

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-5 pb-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-4 w-4" />
            Profile completion
          </CardTitle>
          <CardDescription>Finish a few details to strengthen your profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{safeProfileCompletion}%</span>
          </div>
          <Progress value={safeProfileCompletion} className="h-2" />
          <p className="text-sm text-muted-foreground">Complete your bio and add social links to improve visibility.</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-5 pb-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Shield className="h-4 w-4" />
            Security status
          </CardTitle>
          <CardDescription>Quick visibility into your account security posture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Two-factor auth</span>
              <span className="font-medium text-foreground">Off</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recent sign-in</span>
              <span className="font-medium text-foreground">Today</span>
            </div>
          </div>
          <Button variant="outline" className="h-10 w-full rounded-lg">Review security</Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 bg-background shadow-sm">
        <CardHeader className="p-5 pb-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Zap className="h-4 w-4" />
            Quick actions
          </CardTitle>
          <CardDescription>Frequently used account management shortcuts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          <Separator />
          <Button variant="outline" className="h-10 w-full rounded-lg justify-start">Update password</Button>
          <Button variant="outline" className="h-10 w-full rounded-lg justify-start">Download data</Button>
          <Button variant="outline" className="h-10 w-full rounded-lg justify-start">Manage sessions</Button>
        </CardContent>
      </Card>

    </div>
  )
}
