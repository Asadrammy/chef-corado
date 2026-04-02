import { Resend } from 'resend'

let resend: Resend | null = null

// Initialize Resend only when needed and API key is available
function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

interface EmailData {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailData) {
  const client = getResendClient()
  
  if (!client) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'noreply@chefplatform.com',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  newRequest: (chefName: string, requestTitle: string, requestLocation: string, budget: number) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Service Request Available</h2>
      <p>Hi <strong>${chefName}</strong>,</p>
      <p>A new client request matching your service area has been posted:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #e91e63;">${requestTitle}</h3>
        <p><strong>Location:</strong> ${requestLocation}</p>
        <p><strong>Budget:</strong> $${budget.toFixed(2)}</p>
      </div>
      <p>Log in to your dashboard to view details and submit a proposal.</p>
      <p style="margin-top: 30px;">Best regards,<br>The Chef Platform Team</p>
    </div>
  `,

  newProposal: (clientName: string, chefName: string, proposalPrice: number, requestTitle: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Proposal Received</h2>
      <p>Hi <strong>${clientName}</strong>,</p>
      <p>You've received a new proposal for your request:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4caf50;">${requestTitle}</h3>
        <p><strong>Chef:</strong> ${chefName}</p>
        <p><strong>Proposal Price:</strong> $${proposalPrice.toFixed(2)}</p>
      </div>
      <p>Log in to your dashboard to review the proposal and accept or decline.</p>
      <p style="margin-top: 30px;">Best regards,<br>The Chef Platform Team</p>
    </div>
  `,

  proposalAccepted: (chefName: string, clientName: string, requestTitle: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Proposal Accepted! 🎉</h2>
      <p>Hi <strong>${chefName}</strong>,</p>
      <p>Congratulations! <strong>${clientName}</strong> has accepted your proposal for:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4caf50;">${requestTitle}</h3>
      </div>
      <p>The client will proceed with payment. You'll be notified once payment is confirmed.</p>
      <p style="margin-top: 30px;">Best regards,<br>The Chef Platform Team</p>
    </div>
  `,

  paymentReceived: (userName: string, bookingTitle: string, amount: number) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Payment Received ✅</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Payment has been successfully received for:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4caf50;">${bookingTitle}</h3>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
      </div>
      <p>The payment is now being held in escrow and will be released to the chef after service completion.</p>
      <p style="margin-top: 30px;">Best regards,<br>The Chef Platform Team</p>
    </div>
  `,

  paymentReleased: (chefName: string, amount: number, bookingTitle: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Payment Released! 💰</h2>
      <p>Hi <strong>${chefName}</strong>,</p>
      <p>Your payment has been released for:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4caf50;">${bookingTitle}</h3>
        <p><strong>Amount Released:</strong> $${amount.toFixed(2)}</p>
      </div>
      <p>The funds have been transferred to your account. Thank you for your service!</p>
      <p style="margin-top: 30px;">Best regards,<br>The Chef Platform Team</p>
    </div>
  `,
}
