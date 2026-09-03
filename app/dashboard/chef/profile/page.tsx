"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Save, CheckCircle, Star, Award, Edit, User, FileText, MapPin as LocationIcon, Briefcase, Upload } from "lucide-react"
import { ReviewList } from "@/components/reviews/review-list"
import { CHEF_LEGAL_ACKNOWLEDGEMENT, COUNTRY_OPTIONS, getCurrencyForCountry } from "@/lib/request-options"
import {
  CHEF_CAREER_STAGE_OPTIONS,
  CHEF_SPECIALTY_OPTIONS,
  getChefCareerStageShortLabel,
  getChefSpecialtyLabel,
} from "@/lib/chef-onboarding-options"

interface ChefProfile {
  id: string
  phone?: string
  firstName?: string
  surname?: string
  bio?: string
  experience?: number
  location: string
  radius: number
  baseCountryCode?: string
  preferredCurrency?: string
  isApproved: boolean
  profileImage?: string
  chefType?: string
  careerStage?: string
  specialties?: string[]
  certifications?: string
  cuisineType?: string
  eventsPerMonth?: number
  rightToWorkUkConfirmed?: boolean
  foodHygieneLevel2Confirmed?: boolean
  foodHygieneCertificateUrl?: string
  foodHygieneCertificateUploadedAt?: string | null
  foodHygieneCertificateReviewedAt?: string | null
  foodHygieneCertificateReviewedBy?: string | null
  foodHygieneCertificateReviewStatus?: string | null
  verificationStatus?: string
  approvedAt?: string | null
  approvedBy?: string | null
  reviewedAt?: string | null
  reviewedBy?: string | null
  reviewNotes?: string | null
  termsAcceptedAt?: string | null
  termsVersion?: string | null
  user: {
    name: string
    email: string
    verified?: boolean
    experienceLevel?: string
  }
  _count?: {
    reviews: number
  }
  avgRating?: number
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Array<{ field?: string; message: string }>
  }
  needsProfile?: boolean
}

type ProfileFormData = {
  firstName: string
  surname: string
  bio: string
  phone: string
  experience: string
  location: string
  radius: string
  baseCountryCode: string
  preferredCurrency: string
  profileImage: string
  chefType: string
  careerStage: string
  specialties: string[]
  certifications: string
  cuisineType: string
  eventsPerMonth: string
  rightToWorkUkConfirmed: boolean
  foodHygieneLevel2Confirmed: boolean
  foodHygieneCertificateUrl: string
}

const applyProfileToForm = (
  chefProfile: ChefProfile,
  setProfile: (profile: ChefProfile) => void,
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>
) => {
  setProfile(chefProfile)
  setFormData({
    firstName: chefProfile.firstName || "",
    surname: chefProfile.surname || "",
    bio: chefProfile.bio || "",
    phone: chefProfile.phone || "",
    experience: chefProfile.experience?.toString() || "",
    location: chefProfile.location || "",
    radius: chefProfile.radius?.toString() || "",
    baseCountryCode: chefProfile.baseCountryCode || "GB",
    preferredCurrency: chefProfile.preferredCurrency || getCurrencyForCountry(chefProfile.baseCountryCode || "GB"),
    profileImage: chefProfile.profileImage || "",
    chefType: chefProfile.chefType || "",
    careerStage: chefProfile.careerStage || "",
    specialties: chefProfile.specialties || [],
    certifications: chefProfile.certifications || "",
    cuisineType: chefProfile.cuisineType || "",
    eventsPerMonth: chefProfile.eventsPerMonth?.toString() || "",
    rightToWorkUkConfirmed: chefProfile.rightToWorkUkConfirmed || false,
    foodHygieneLevel2Confirmed: chefProfile.foodHygieneLevel2Confirmed || false,
    foodHygieneCertificateUrl: chefProfile.foodHygieneCertificateUrl || "",
  })
}

export default function ChefProfilePage() {
  const [profile, setProfile] = useState<ChefProfile | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    surname: "",
    bio: "",
    phone: "",
    experience: "",
    location: "",
    radius: "",
    baseCountryCode: "GB",
    preferredCurrency: "GBP",
    profileImage: "",
    chefType: "",
    careerStage: "",
    specialties: [],
    certifications: "",
    cuisineType: "",
    eventsPerMonth: "",
    rightToWorkUkConfirmed: false,
    foodHygieneLevel2Confirmed: false,
    foodHygieneCertificateUrl: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingCertificate, setUploadingCertificate] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/chef/profile")
      const payload = (await response.json()) as ApiEnvelope<ChefProfile>

      if (!response.ok) {
        if (payload.needsProfile) {
          setProfile(null)
          return
        }
        throw new Error(payload.error?.message || "Failed to fetch profile")
      }

      if (!payload.data) {
        throw new Error("Failed to fetch profile")
      }

      applyProfileToForm(payload.data, setProfile, setFormData)
    } catch {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: "rightToWorkUkConfirmed" | "foodHygieneLevel2Confirmed", checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const submitData = {
        firstName: formData.firstName || undefined,
        surname: formData.surname || undefined,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        experience: formData.experience ? parseInt(formData.experience) : undefined,
        location: formData.location,
        radius: parseFloat(formData.radius),
        baseCountryCode: formData.baseCountryCode,
        preferredCurrency: formData.preferredCurrency,
        profileImage: formData.profileImage || undefined,
        chefType: formData.chefType || undefined,
        careerStage: formData.careerStage || undefined,
        specialties: formData.specialties,
        certifications: formData.certifications || undefined,
        cuisineType: formData.cuisineType || undefined,
        eventsPerMonth: formData.eventsPerMonth ? parseInt(formData.eventsPerMonth) : undefined,
        rightToWorkUkConfirmed: formData.rightToWorkUkConfirmed,
        foodHygieneLevel2Confirmed: formData.foodHygieneLevel2Confirmed,
        foodHygieneCertificateUrl: formData.foodHygieneCertificateUrl || undefined,
      }

      const response = await fetch(profile ? "/api/chef/profile" : "/api/chef/profile/create", {
        method: profile ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const payload = (await response.json()) as ApiEnvelope<ChefProfile>
        if (payload.error?.details) {
          setError(payload.error.details.map((d) => d.message).join(", "))
        } else {
          setError(payload.error?.message || "Failed to update profile")
        }
        return
      }

      const payload = (await response.json()) as ApiEnvelope<ChefProfile>
      if (!payload.data) {
        setError(profile ? "Failed to update profile" : "Failed to create profile")
        return
      }

      applyProfileToForm(payload.data, setProfile, setFormData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const calculateProfileCompletion = () => {
    if (!profile) return 0
    const fields = [
      profile.firstName,
      profile.surname,
      profile.phone,
      profile.bio,
      profile.experience,
      profile.location,
      profile.radius,
      profile.profileImage,
      profile.careerStage,
      profile.specialties?.length,
      profile.cuisineType,
      profile.eventsPerMonth,
      profile.rightToWorkUkConfirmed,
      profile.foodHygieneLevel2Confirmed,
    ]
    const completed = fields.filter((field) => field && field !== "").length
    return Math.round((completed / fields.length) * 100)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError("")

    try {
      const payload = new FormData()
      payload.append("file", file)
      payload.append("purpose", "profile")

      const response = await fetch("/api/chef/profile/photo", {
        method: "POST",
        body: payload,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || "Failed to upload profile image")
      }

      const result = await response.json()
      const profileImage = result.profileImage as string

      setProfile((current) => current ? { ...current, profileImage } : current)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      setFormData((prev) => ({ ...prev, profileImage }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload profile image")
    } finally {
      setUploadingImage(false)
      e.target.value = ""
    }
  }

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCertificate(true)
    setError("")
    setSuccess(false)

    try {
      const payload = new FormData()
      payload.append("file", file)
      payload.append("purpose", "profile")

      const response = await fetch("/api/chef/certificates", {
        method: "POST",
        body: payload,
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || "Failed to upload food hygiene certificate")
      }

      setFormData((prev) => ({ ...prev, foodHygieneCertificateUrl: result.url as string }))
      setProfile((current) =>
        current
          ? {
              ...current,
              foodHygieneCertificateUrl: result.url,
              foodHygieneCertificateUploadedAt: result.uploadedAt,
              foodHygieneCertificateReviewStatus: result.reviewStatus,
              foodHygieneCertificateReviewedAt: null,
              foodHygieneCertificateReviewedBy: null,
            }
          : current
      )
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload food hygiene certificate")
    } finally {
      setUploadingCertificate(false)
      e.target.value = ""
    }
  }

  const handleSpecialtyChange = (value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      specialties: checked
        ? Array.from(new Set([...prev.specialties, value]))
        : prev.specialties.filter((item) => item !== value),
    }))
  }

  const approvalStatus = (profile as any)?.verificationStatus ?? (profile?.isApproved ? "APPROVED" : "PENDING")
  const certificateStatus = profile?.foodHygieneCertificateReviewStatus ?? (formData.foodHygieneCertificateUrl ? "PENDING" : "NOT_SUBMITTED")
  const displayName = [formData.firstName.trim(), formData.surname.trim()].filter(Boolean).join(" ") || profile?.user.name || "Chef"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Chef profile</h1>
        <p className="text-muted-foreground">
          Manage your account details, professional profile, saved service radius, and private legal compliance information.
        </p>
        <div className="flex flex-wrap gap-3">
          {profile?.id ? (
            <Button variant="outline" asChild>
              <Link href={`/chefs/${profile.id}?preview=1`}>Preview public profile</Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href="/dashboard/chef/settings">Open settings for notifications, Stripe, and legal status</Link>
          </Button>
        </div>
      </div>

      {approvalStatus === "APPROVED" ? (
        <div className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <p className="text-sm">You are approved for platform bookings.</p>
        </div>
      ) : null}

      {approvalStatus === "PENDING" ? (
        <div className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-700">
          <p className="text-sm">Your profile is pending approval.</p>
        </div>
      ) : null}

      {approvalStatus === "REJECTED" ? (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <p className="text-sm">Your profile requires review.</p>
        </div>
      ) : null}

      {approvalStatus === "CHANGES_REQUESTED" ? (
        <div className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700">
          <p className="text-sm">Admin has requested changes. You can update your profile here and resubmit for review.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-3">
        <div className="w-full min-w-0 lg:col-span-1">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl dark:bg-gray-900">
            <div className="mb-6 flex flex-col items-center space-y-5">
              <div className="relative flex w-full justify-center group">
                <div className="brand-gradient-surface absolute top-0 left-0 h-32 w-full rounded-t-2xl"></div>
                <Avatar className="z-10 mt-8 -mb-12 h-24 w-24 -translate-y-1/2 rounded-full border-4 border-white ring-4 ring-white shadow-lg dark:border-gray-900">
                  <AvatarImage src={formData.profileImage || profile?.profileImage} />
                  <AvatarFallback className="text-4xl font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Edit className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <Button type="button" variant="outline" disabled={uploadingImage} asChild>
                <label className="cursor-pointer">
                  {uploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {formData.profileImage ? "Replace profile photo" : "Upload profile photo"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </Button>
              {uploadingImage ? <p className="text-xs text-gray-500">Uploading profile image...</p> : null}
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                Use a clear face-visible photo that presents you professionally as a chef, such as in a chef coat, apron, or chef cap where appropriate.
              </p>

              <div className="mt-16 text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h3>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">Chef</Badge>
                  {formData.careerStage ? (
                    <Badge variant="outline" className="text-xs">{getChefCareerStageShortLabel(formData.careerStage)}</Badge>
                  ) : null}
                  {profile?.user.verified ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">Verified</span>
                    </div>
                  ) : null}
                </div>
                {formData.specialties.length > 0 ? (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {formData.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {getChefSpecialtyLabel(specialty)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="my-4 mb-6 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-300">Profile Completion</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white">{calculateProfileCompletion()}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div className="brand-gradient-surface h-2.5 rounded-full transition-all duration-300" style={{ width: `${calculateProfileCompletion()}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 text-center transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <span className="block text-sm text-gray-500 dark:text-gray-300">Reviews</span>
                <span className="block text-lg font-semibold text-gray-800 dark:text-white">{profile?._count?.reviews || 0}</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <span className="block text-sm text-gray-500 dark:text-gray-300">Rating</span>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">{profile?.avgRating?.toFixed(1) || "0.0"}</span>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <span className="block text-sm text-gray-500 dark:text-gray-300">Years of Experience</span>
                <span className="block text-lg font-semibold text-gray-800 dark:text-white">{profile?.experience || 0} years</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
                <span className="block text-sm text-gray-500 dark:text-gray-300">Service Area</span>
                <span className="block text-lg font-semibold text-gray-800 dark:text-white">{profile?.radius || 0} km</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 space-y-8 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account</h2>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-sm text-gray-500 dark:text-gray-300">First name</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <Label htmlFor="surname" className="text-sm text-gray-500 dark:text-gray-300">Surname</Label>
                    <Input id="surname" name="surname" value={formData.surname} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="displayName" className="text-sm text-gray-500 dark:text-gray-300">Display name</Label>
                  <Input id="displayName" value={displayName} disabled className="mt-1 rounded-xl border-gray-200 bg-gray-50" />
                  <p className="mt-1 text-xs text-gray-400">This is generated from your first name and surname for your profile display.</p>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm text-gray-500 dark:text-gray-300">Email</Label>
                  <Input id="email" value={profile?.user.email || ""} disabled className="mt-1 rounded-xl border-gray-200 bg-gray-50" />
                  <p className="mt-1 text-xs text-gray-400">Email is kept for account access and service communications.</p>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm text-gray-500 dark:text-gray-300">Phone number</Label>
                  <Input id="phone" name="phone" placeholder="For account support only. Phone numbers are not shown publicly." value={formData.phone} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Professional Summary</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="bio" className="text-sm text-gray-500 dark:text-gray-300">Bio</Label>
                  <Textarea id="bio" name="bio" placeholder="Tell clients about your cooking style, specialties, and experience..." value={formData.bio} onChange={handleChange} rows={4} className="mt-1 min-h-[100px] resize-none rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                  <p className="mt-1 text-xs text-gray-400">Share your culinary background and what makes you unique.</p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="experience" className="text-sm text-gray-500 dark:text-gray-300">Years of experience</Label>
                  <Input id="experience" name="experience" type="number" min="0" placeholder="e.g., 5" value={formData.experience} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-500 dark:text-gray-300">Chef career stage / background</Label>
                  <div className="mt-2 grid gap-3">
                    {CHEF_CAREER_STAGE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                          formData.careerStage === option.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="careerStage"
                          value={option.value}
                          checked={formData.careerStage === option.value}
                          onChange={() => setFormData((prev) => ({ ...prev, careerStage: option.value }))}
                          className="mt-1 h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm text-gray-500 dark:text-gray-300">Chef specialties</Label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {CHEF_SPECIALTY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <Checkbox
                          checked={formData.specialties.includes(option.value)}
                          onCheckedChange={(checked) => handleSpecialtyChange(option.value, checked === true)}
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Choose every service area that genuinely applies. This replaces the old single Chef type dropdown.
                  </p>
                </div>

                <div>
                  <Label htmlFor="cuisineType" className="text-sm text-gray-500 dark:text-gray-300">Cuisine focus</Label>
                  <Input id="cuisineType" name="cuisineType" placeholder="e.g., Modern British" value={formData.cuisineType} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                </div>

                <div>
                  <Label htmlFor="eventsPerMonth" className="text-sm text-gray-500 dark:text-gray-300">Events per month</Label>
                  <Input id="eventsPerMonth" name="eventsPerMonth" type="number" min="0" placeholder="e.g., 12" value={formData.eventsPerMonth} onChange={handleChange} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="certifications" className="text-sm text-gray-500 dark:text-gray-300">Additional professional certifications</Label>
                  <Textarea id="certifications" name="certifications" placeholder="Optional: add extra professional certifications that support your profile. Do not use this for right-to-work or food hygiene confirmations." value={formData.certifications} onChange={handleChange} rows={3} className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <LocationIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location & Service Area</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="location" className="text-sm text-gray-500 dark:text-gray-300">Base location</Label>
                  <Input id="location" name="location" placeholder="e.g., London" value={formData.location} onChange={handleChange} required className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                  <p className="mt-1 text-xs text-gray-400">Your base location is used for travel and request matching.</p>
                </div>

                <div>
                  <Label htmlFor="radius" className="text-sm text-gray-500 dark:text-gray-300">Saved service radius (km)</Label>
                  <Input id="radius" name="radius" type="number" min="1" max="500" step="0.5" placeholder="e.g., 25" value={formData.radius} onChange={handleChange} required className="mt-1 rounded-xl border-gray-200 bg-gray-50 transition-all duration-200 focus:scale-[1.01] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30" />
                  <p className="mt-1 text-xs text-gray-400">This saved radius controls which open customer requests are matched to you. The Requests page slider only narrows the current view temporarily.</p>
                </div>

                <div>
                  <Label htmlFor="baseCountryCode" className="text-sm text-gray-500 dark:text-gray-300">Base country</Label>
                  <Select
                    value={formData.baseCountryCode}
                    onValueChange={(value) => setFormData((prev) => ({
                      ...prev,
                      baseCountryCode: value,
                      preferredCurrency: getCurrencyForCountry(value),
                    }))}
                  >
                    <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white">
                      <SelectValue placeholder="Select base country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="preferredCurrency" className="text-sm text-gray-500 dark:text-gray-300">Preferred currency</Label>
                  <Select value={formData.preferredCurrency} onValueChange={(value) => setFormData((prev) => ({ ...prev, preferredCurrency: value }))}>
                    <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white">
                      <SelectValue placeholder="Select preferred currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((option) => (
                        <SelectItem key={option.currency} value={option.currency}>{option.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Compliance & Approval</h2>
              </div>

              <div className="space-y-4 text-sm text-gray-500 dark:text-gray-300">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="font-medium text-gray-900 dark:text-white">Chef approval status</p>
                  <p className="mt-1">
                    {approvalStatus === "APPROVED"
                      ? "Approved"
                      : approvalStatus === "REJECTED"
                      ? "Rejected"
                      : approvalStatus === "CHANGES_REQUESTED"
                      ? "Changes requested"
                      : "Pending"}
                  </p>
                  {profile?.reviewNotes ? (
                    <p className="mt-2 rounded-lg bg-white p-3 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">{profile.reviewNotes}</p>
                  ) : null}
                  {profile?.approvedAt ? (
                    <p className="mt-1 text-xs">Approved at: {new Date(profile.approvedAt).toLocaleString()}</p>
                  ) : null}
                  {profile?.approvedBy ? (
                    <p className="mt-1 text-xs">Approved by: {profile.approvedBy}</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="font-medium text-gray-900 dark:text-white">Terms status</p>
                  <p className="mt-1">{profile?.termsAcceptedAt ? `Accepted ${new Date(profile.termsAcceptedAt).toLocaleString()}` : "Missing acknowledgement"}</p>
                  <p className="mt-1 text-xs">Version: {profile?.termsVersion ?? "Not recorded"}</p>
                  <p className="mt-1 text-xs">Notification preferences and Stripe connection are managed from Settings.</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="mb-4 font-medium text-gray-900 dark:text-white">Structured compliance</p>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.rightToWorkUkConfirmed}
                        onChange={(e) => handleCheckboxChange("rightToWorkUkConfirmed", e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">I confirm I have the legal right to work in the UK.</span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.foodHygieneLevel2Confirmed}
                        onChange={(e) => handleCheckboxChange("foodHygieneLevel2Confirmed", e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">I confirm I have completed Level 2 Food Hygiene & Safety training.</span>
                    </label>

                    <div className="rounded-xl border border-white bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Label htmlFor="foodHygieneCertificateFile" className="text-sm text-gray-700 dark:text-gray-200">Upload Level 2 Food Hygiene certificate</Label>
                          <p className="mt-1 text-xs text-gray-400">PDF, JPEG, PNG, or WebP. This private document is used for admin review only and is never shown on your public profile.</p>
                        </div>
                        <Badge variant={certificateStatus === "APPROVED" ? "default" : certificateStatus === "REJECTED" ? "destructive" : "secondary"}>
                          {certificateStatus === "NOT_SUBMITTED" ? "Not submitted" : certificateStatus.toLowerCase()}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button type="button" variant="outline" disabled={uploadingCertificate} asChild>
                          <label htmlFor="foodHygieneCertificateFile" className="cursor-pointer">
                            {uploadingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {formData.foodHygieneCertificateUrl ? "Replace certificate" : "Upload certificate"}
                          </label>
                        </Button>
                        <input
                          id="foodHygieneCertificateFile"
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleCertificateUpload}
                          disabled={uploadingCertificate}
                        />
                        {formData.foodHygieneCertificateUrl ? (
                          <Button type="button" variant="ghost" asChild>
                            <Link href={formData.foodHygieneCertificateUrl} target="_blank" rel="noreferrer">View uploaded certificate</Link>
                          </Button>
                        ) : null}
                      </div>

                      {profile?.foodHygieneCertificateUploadedAt ? (
                        <p className="mt-3 text-xs text-gray-400">Uploaded {new Date(profile.foodHygieneCertificateUploadedAt).toLocaleString()}</p>
                      ) : null}
                      {profile?.foodHygieneCertificateReviewedAt ? (
                        <p className="mt-1 text-xs text-gray-400">Reviewed {new Date(profile.foodHygieneCertificateReviewedAt).toLocaleString()}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
                  {CHEF_LEGAL_ACKNOWLEDGEMENT} Review the <Link href="/terms/chef" className="font-medium text-foreground hover:text-primary">Chef Terms</Link>, <Link href="/terms/client" className="font-medium text-foreground hover:text-primary">Client Terms</Link>, and <Link href="/privacy" className="font-medium text-foreground hover:text-primary">Privacy Policy</Link> if anything needs to be refreshed.
                  <div className="mt-2">You do not upload insurance documents here. The platform handles insurance after chef approval and after right-to-work and Level 2 Food Hygiene confirmations are complete.</div>
                </div>
              </div>
            </div>

            {error ? (
              <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 transition-all duration-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            {success ? (
              <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 transition-all duration-200">
                <p className="text-sm text-green-700">Profile updated successfully!</p>
              </div>
            ) : null}

            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="brand-gradient-button rounded-xl px-6 py-3 font-medium shadow-md transition-all duration-200 hover:scale-[1.05] hover:shadow-lg active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {profile?.id ? (
            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Client Feedback</h2>
              </div>

              {profile._count?.reviews === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 inline-block rounded-full bg-gray-100 p-4 transition-all duration-200 hover:scale-110 dark:bg-gray-800">
                    <div className="text-3xl animate-pulse">?</div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No reviews yet. Complete your profile and start receiving bookings to get client feedback!
                  </p>
                </div>
              ) : (
                <ReviewList chefId={profile.id} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
