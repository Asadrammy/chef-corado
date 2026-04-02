// Temporary Prisma extension to handle WebhookLog model
import { PrismaClient } from '@prisma/client'

// Extend PrismaClient to include WebhookLog model
declare module '@prisma/client' {
  interface PrismaClient {
    // @ts-ignore - Temporary override for WebhookLog model
    webhookLog: any
  }
}

// Create extended client with WebhookLog support
export function createExtendedPrismaClient() {
  const prisma = new PrismaClient()
  
  // Add WebhookLog model temporarily
  // @ts-ignore - Temporary workaround for WebhookLog model
  prisma.webhookLog = {
    create: async (data: any) => {
      // For now, just return a mock response to prevent errors
      // In production, this would be properly handled by regenerated Prisma client
      console.log('WebhookLog.create called:', data)
      return { id: 'temp-id', ...data.data }
    },
    findUnique: async (params: any) => {
      console.log('WebhookLog.findUnique called:', params)
      return null // Return null for now
    },
    update: async (params: any) => {
      console.log('WebhookLog.update called:', params)
      return { id: params.where.id, ...params.data }
    }
  }
  
  return prisma
}

export default createExtendedPrismaClient
