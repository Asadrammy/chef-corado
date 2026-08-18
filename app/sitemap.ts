import { MetadataRoute } from 'next'

import { prisma } from '@/lib/prisma'
import { getConfiguredAppBaseUrl } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getConfiguredAppBaseUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/browse-chefs`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/find-local-chef`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/experiences`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/become-a-chef`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/our-story`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/property-manager-affiliate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/be-a-venue-partner`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  try {
    const [chefs, experiences] = await Promise.all([
      prisma.chefProfile.findMany({
        where: {
          isApproved: true,
          isBanned: false,
          verificationStatus: 'APPROVED',
        },
        select: {
          id: true,
          updatedAt: true,
        },
        take: 5000,
      }),
      prisma.experience.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          updatedAt: true,
        },
        take: 5000,
      }),
    ])

    return [
      ...staticRoutes,
      ...chefs.map((chef) => ({
        url: `${baseUrl}/chefs/${chef.id}`,
        lastModified: chef.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...experiences.map((experience) => ({
        url: `${baseUrl}/experiences/${experience.id}`,
        lastModified: experience.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ]
  } catch {
    return staticRoutes
  }
}
