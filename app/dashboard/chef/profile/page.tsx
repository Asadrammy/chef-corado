"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Save, CheckCircle, Star, MapPin, Award, Edit, User, FileText, MapPin as LocationIcon, Briefcase } from "lucide-react"
import { ReviewList } from "@/components/reviews/review-list"

interface ChefProfile {
  id: string
  bio?: string
  experience?: number
  location: string
  radius: number
  isApproved: boolean
  profileImage?: string
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

export default function ChefProfilePage() {
  const [profile, setProfile] = useState<ChefProfile | null>(null)
  const [formData, setFormData] = useState({
    bio: "",
    experience: "",
    location: "",
    radius: "",
    profileImage: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/chef/profile")
      const data = await response.json()
      
      if (!response.ok) {
        if (data.needsProfile) {
          // Profile doesn't exist, create a default one
          await createDefaultProfile()
          return
        }
        throw new Error(data.error || "Failed to fetch profile")
      }
      
      setProfile(data)
      setFormData({
        bio: data.bio || "",
        experience: data.experience?.toString() || "",
        location: data.location || "",
        radius: data.radius?.toString() || "",
        profileImage: data.profileImage || "",
      })
    } catch (err) {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const createDefaultProfile = async () => {
    try {
      const defaultData = {
        location: "New York, NY",
        radius: 25,
        bio: "Professional chef with a passion for creating memorable culinary experiences.",
        experience: 5,
      }

      const response = await fetch("/api/chef/profile/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(defaultData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create profile")
      }

      const newProfile = await response.json()
      setProfile(newProfile)
      setFormData({
        bio: newProfile.bio || "",
        experience: newProfile.experience?.toString() || "",
        location: newProfile.location || "",
        radius: newProfile.radius?.toString() || "",
        profileImage: newProfile.profileImage || "",
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError("Failed to create profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      const submitData = {
        bio: formData.bio || undefined,
        experience: formData.experience ? parseInt(formData.experience) : undefined,
        location: formData.location,
        radius: parseFloat(formData.radius),
        profileImage: formData.profileImage || undefined,
      }

      const response = await fetch("/api/chef/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.details) {
          setError(data.details.map((d: any) => d.message).join(", "))
        } else {
          setError(data.error || "Failed to update profile")
        }
        return
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const calculateProfileCompletion = () => {
    if (!profile) return 0
    const fields = [
      profile.bio,
      profile.experience,
      profile.location,
      profile.radius,
      profile.profileImage
    ]
    const completed = fields.filter(field => field && field !== "").length
    return Math.round((completed / fields.length) * 100)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now, just create a preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }))
      }
      reader.readAsDataURL(file)
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
    <div className="w-full flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your professional information and service area
          </p>
        </div>

        {/* Approval Status Alert */}
        {profile?.isApproved && (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">
            <p className="text-sm">✅ Your profile is approved and visible to clients</p>
          </div>
        )}

        {!profile?.isApproved && (
          <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3">
            <p className="text-sm">⚠ Your profile is pending approval. Complete your information to get approved faster.</p>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column - Profile Summary */}
          <div className="lg:col-span-1 w-full min-w-0">
            <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-8 hover:scale-[1.03]">
              {/* Profile Image with Gradient Header */}
              <div className="flex flex-col items-center mb-6 space-y-5">
                <div className="relative group w-full flex justify-center">
                  <div className="w-full h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl absolute top-0 left-0"></div>
                  <Avatar className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 z-10 mt-8 -mb-12 ring-4 ring-white shadow-lg transition-all duration-300 transform -translate-y-1/2">
                    <AvatarImage src={formData.profileImage || profile?.profileImage} />
                    <AvatarFallback className="text-4xl font-bold text-white">
                      {profile?.user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200 z-20">
                    <Edit className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                
                {/* Name and Role */}
                <div className="text-center mt-16">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profile?.user.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">Chef</Badge>
                    {profile?.user.verified && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Completion */}
              <div className="mb-6 border-t border-gray-100 pt-4 my-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-300">
                    Profile Completion
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {calculateProfileCompletion()}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProfileCompletion()}%` }}
                  />
                </div>
              </div>

              {/* Stats in Mini Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]">
                  <span className="text-sm text-gray-500 dark:text-gray-300 block">Reviews</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white block">
                    {profile?._count?.reviews || 0}
                  </span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]">
                  <span className="text-sm text-gray-500 dark:text-gray-300 block">Rating</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-lg font-semibold text-gray-800 dark:text-white">
                      {profile?.avgRating?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]">
                  <span className="text-sm text-gray-500 dark:text-gray-300 block">Experience</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white block">
                    {profile?.experience || 0} years
                  </span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]">
                  <span className="text-sm text-gray-500 dark:text-gray-300 block">Service Area</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white block">
                    {profile?.radius || 0} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 w-full min-w-0 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h2>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-sm text-gray-500 dark:text-gray-300">Name</Label>
                    <Input
                      id="name"
                      value={profile?.user.name || ""}
                      disabled
                      className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 focus:scale-[1.01]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Name cannot be changed here</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm text-gray-500 dark:text-gray-300">Email</Label>
                    <Input
                      id="email"
                      value={profile?.user.email || ""}
                      disabled
                      className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 focus:scale-[1.01]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
                  </div>
                </div>
              </div>

              {/* Professional Bio Section */}
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Professional Bio</h2>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="bio" className="text-sm text-gray-500 dark:text-gray-300">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell clients about your cooking style, specialties, and experience..."
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="mt-1 resize-none rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] transition-all duration-200 focus:scale-[1.01]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Share your culinary background and what makes you unique</p>
                  </div>
                </div>
              </div>

              {/* Experience & Service Section */}
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Experience & Service</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="experience" className="text-sm text-gray-500 dark:text-gray-300">Years of Experience</Label>
                    <Input
                      id="experience"
                      name="experience"
                      type="number"
                      min="0"
                      placeholder="e.g., 5"
                      value={formData.experience}
                      onChange={handleChange}
                      className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 focus:scale-[1.01]"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="radius" className="text-sm text-gray-500 dark:text-gray-300">Service Radius (km)</Label>
                    <Input
                      id="radius"
                      name="radius"
                      type="number"
                      min="1"
                      max="500"
                      step="0.5"
                      placeholder="e.g., 25"
                      value={formData.radius}
                      onChange={handleChange}
                      required
                      className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 focus:scale-[1.01]"
                    />
                    <p className="text-xs text-gray-400 mt-1">How far are you willing to travel?</p>
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                    <LocationIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Location</h2>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="location" className="text-sm text-gray-500 dark:text-gray-300">Base Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., New York, NY"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="mt-1 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 focus:scale-[1.01]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Your base location for calculating travel distance</p>
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 transition-all duration-200">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 transition-all duration-200">
                  <p className="text-green-700 text-sm">Profile updated successfully!</p>
                </div>
              )}

              {/* Actions Section */}
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]"
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

            {/* Client Feedback Section */}
            {profile?.id && (
              <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Client Feedback</h2>
                </div>
                
                {profile._count?.reviews === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 inline-block mb-4 transition-all duration-200 hover:scale-110">
                      <div className="text-3xl animate-pulse">⭐</div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No reviews yet. Complete your profile and start receiving bookings to get client feedback!
                    </p>
                  </div>
                ) : (
                  <ReviewList chefId={profile.id} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
