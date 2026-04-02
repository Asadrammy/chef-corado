import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, Star, ChefHat, DollarSign } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ExperiencePageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperiencePage({ params }: ExperiencePageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const experience = await prisma.experience.findUnique({
    where: { id },
    include: {
      chef: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!experience) {
    notFound();
  }

  const isOwner = session?.user?.id === experience.chef.userId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-orange-400 to-red-500">
        {experience.experienceImage && (
          <Image
            src={experience.experienceImage}
            alt={experience.title}
            fill
            className="object-cover opacity-30"
          />
        )}
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="text-white max-w-3xl">
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {experience.cuisineType}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>New</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{experience.title}</h1>
            <p className="text-xl mb-6">{experience.description}</p>
            <div className="flex items-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">${experience.price}</span>
                <span className="text-white/80">per person</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{experience.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Up to {experience.maxGuests} guests</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Chef Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  About the Chef
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <ChefHat className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{experience.chef.user.name}</h3>
                    <p className="text-gray-600 mb-2">{experience.chef.bio}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {experience.chef.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>No rating yet</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            {experience.includedServices && (
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{experience.includedServices}</p>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {experience.tags && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {experience.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {experience.chef.location && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{experience.chef.location}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-2xl">${experience.price}</CardTitle>
                <CardDescription>Per person</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{experience.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max guests:</span>
                    <span>{experience.maxGuests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total bookings:</span>
                    <span>{experience._count.bookings}</span>
                  </div>
                </div>

                {session ? (
                  isOwner ? (
                    <Button asChild className="w-full">
                      <Link href="/dashboard/chef/experiences">
                        Manage Experience
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full" size="lg">
                      <Link href={`/dashboard/search?experienceId=${experience.id}`}>
                        Book This Experience
                      </Link>
                    </Button>
                  )
                ) : (
                  <div className="space-y-2">
                    <Button asChild className="w-full" size="lg">
                      <Link href="/login">Login to Book</Link>
                    </Button>
                    <p className="text-sm text-gray-600 text-center">
                      Need an account?{" "}
                      <Link href="/register" className="text-orange-600 hover:underline">
                        Sign up
                      </Link>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chef Verification */}
            {experience.chef.verified && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">Verified Chef</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This chef has been verified by our team
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
