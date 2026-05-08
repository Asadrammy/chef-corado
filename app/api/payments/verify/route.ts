import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers'
import { handleApiError, ApiError } from '@/lib/error-handler'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!sessionId && !paymentIntentId) {
      return NextResponse.json({
        verified: false,
        error: 'session_id or payment_intent_id is required',
      }, { status: 400 })
    }

    let stripePaymentIntentId = paymentIntentId

    // If session_id is provided, retrieve the payment intent from Stripe
    if (sessionId && !paymentIntentId) {
      if (!process.env.STRIPE_SECRET_KEY || 
          process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
          process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
          process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
        return NextResponse.json({
          verified: false,
          error: 'Stripe not configured',
        }, { status: 500 })
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (session.payment_intent) {
          stripePaymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id
        }
      } catch (error) {
        console.error('Failed to retrieve Stripe session:', error)
        return NextResponse.json({
          verified: false,
          error: 'Invalid session_id',
        }, { status: 400 })
      }
    }

    if (!stripePaymentIntentId) {
      return NextResponse.json({
        verified: false,
        error: 'Could not determine payment intent',
      }, { status: 400 })
    }

    // Find payment by Stripe payment intent ID
    const payment = await prisma.payment.findFirst({
      where: {
        stripePaymentIntentId,
      },
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
            proposal: {
              include: {
                request: {
                  select: {
                    title: true,
                    eventDate: true,
                    location: true,
                  },
                },
              },
            },
            experience: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      // Payment not found in DB - try reconciliation
      const { paymentReconciliation } = await import('@/lib/services/payment-reconciliation')
      const reconcileResult = await paymentReconciliation.reconcilePayment(stripePaymentIntentId)
      
      if (reconcileResult.reconciled && reconcileResult.bookingId) {
        // Fetch the newly created booking
        const newPayment = await prisma.payment.findUnique({
          where: { id: reconcileResult.paymentId },
          include: {
            booking: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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
                proposal: {
                  include: {
                    request: {
                      select: {
                        title: true,
                        eventDate: true,
                        location: true,
                      },
                    },
                  },
                },
                experience: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        })
        
        if (newPayment && newPayment.booking) {
          return NextResponse.json({
            verified: true,
            booking: newPayment.booking,
            payment: newPayment,
            reconciled: true,
          })
        }
      }

      return NextResponse.json({
        verified: false,
        error: 'Payment not found and reconciliation failed',
      }, { status: 404 })
    }

    // Verify payment status
    if (payment.status !== 'PAID') {
      return NextResponse.json({
        verified: false,
        error: `Payment not completed: ${payment.status}`,
      })
    }

    // Verify booking status
    if (payment.booking.status !== 'CONFIRMED' && payment.booking.status !== 'COMPLETED') {
      return NextResponse.json({
        verified: false,
        error: `Booking not confirmed: ${payment.booking.status}`,
      })
    }

    // Verify user owns this booking
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)
    if (payment.booking.clientId !== userId) {
      return NextResponse.json({
        verified: false,
        error: 'Unauthorized',
      }, { status: 403 })
    }

    return NextResponse.json({
      verified: true,
      booking: payment.booking,
      payment,
    })

  } catch (error) {
    return handleApiError(error, 'Payment Verification')
  }
}
