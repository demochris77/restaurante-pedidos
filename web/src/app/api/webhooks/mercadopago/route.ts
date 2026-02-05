import { NextRequest, NextResponse } from 'next/server'
import { mercadopago, MERCADOPAGO_PLANS, PlanType } from '@/lib/mercadopago'
import { Payment, PreApproval } from 'mercadopago'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getPlanLimits, getNextBillingDate, getGracePeriodEnd } from '@/lib/mercadopago-subscriptions'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Mercado Pago webhook received:', body)

        // Mercado Pago sends different types of notifications
        const { type, data, action } = body

        // Handle preapproval (subscription) events
        if (type === 'subscription_preapproval' || type === 'preapproval') {
            return handlePreapprovalEvent(data, action)
        }

        // Handle payment events (for recurring subscription payments)
        if (type === 'subscription_authorized_payment') {
            return handleSubscriptionPayment(data)
        }

        // Handle one-time payment for new organization creation
        if (type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') {
            console.log('Ignoring notification:', type, action)
            return NextResponse.json({ received: true })
        }

        // Get payment ID from notification
        const paymentId = data?.id

        if (!paymentId) {
            console.error('No payment ID in webhook data')
            return NextResponse.json({ error: 'No payment ID' }, { status: 400 })
        }

        // Fetch payment details from Mercado Pago API
        const paymentClient = new Payment(mercadopago)
        const payment = await paymentClient.get({ id: paymentId })

        console.log('Payment details:', {
            id: payment.id,
            status: payment.status,
            status_detail: payment.status_detail,
        })

        // Only process approved payments
        if (payment.status !== 'approved') {
            console.log('Payment not approved, status:', payment.status)
            return NextResponse.json({ received: true })
        }

        // Check if this payment was already processed
        const existingSubscription = await prisma.subscription.findFirst({
            where: {
                preapprovalId: payment.id?.toString(),
            },
        })

        if (existingSubscription) {
            console.log('Payment already processed:', payment.id)
            return NextResponse.json({ received: true, message: 'Already processed' })
        }

        // Extract metadata from payment
        const metadata = payment.metadata as any

        console.log('Payment metadata:', JSON.stringify(metadata, null, 2))

        if (!metadata) {
            console.error('No metadata in payment:', payment.id)
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        // Extract fields - Mercado Pago might nest them differently
        const plan = metadata.plan
        const restaurantName = metadata.restaurant_name || metadata.restaurantName
        const slug = metadata.slug
        const contactEmail = metadata.contact_email || metadata.contactEmail
        const adminName = metadata.admin_name || metadata.adminName
        const username = metadata.username
        const password = metadata.password

        console.log('Extracted metadata:', {
            plan,
            restaurantName,
            slug,
            contactEmail,
            adminName,
            username,
            hasPassword: !!password
        })

        if (!plan || !slug || !restaurantName || !username || !password) {
            console.error('Missing required metadata fields:', {
                plan: !!plan,
                slug: !!slug,
                restaurantName: !!restaurantName,
                username: !!username,
                password: !!password
            })
            return NextResponse.json({
                error: 'Missing required metadata fields',
                details: { plan: !!plan, slug: !!slug, restaurantName: !!restaurantName }
            }, { status: 400 })
        }

        const selectedPlan = MERCADOPAGO_PLANS[plan as PlanType]

        if (!selectedPlan) {
            console.error('Invalid plan in metadata:', plan)
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create organization, admin user, and subscription in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Organization
            const organization = await tx.organization.create({
                data: {
                    name: restaurantName,
                    slug,
                    maxTables: selectedPlan.maxTables,
                    maxUsers: selectedPlan.maxUsers,
                },
            })

            // 2. Create Admin User
            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    name: adminName,
                    role: 'admin',
                    organizationId: organization.id,
                },
            })

            // 3. Create Subscription
            const subscription = await tx.subscription.create({
                data: {
                    organizationId: organization.id,
                    plan,
                    status: 'active',
                    paymentProvider: 'mercadopago',
                    customerId: payment.payer?.id?.toString() || null,
                    preapprovalId: payment.id?.toString() || null,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                },
            })

            return { organization, user, subscription }
        })

        console.log('Successfully created organization:', result.organization.slug)
        console.log('Admin user created:', result.user.username)

        // Send welcome email
        try {
            const plans = [
                { id: 'starter', name: 'Starter' },
                { id: 'professional', name: 'Professional' },
                { id: 'enterprise', name: 'Enterprise' }
            ]
            const selectedPlan = plans.find((p: { id: string; name: string }) => p.id === plan)
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'welcome',
                    to: contactEmail,
                    data: {
                        adminName,
                        restaurantName,
                        username,
                        plan: selectedPlan?.name || plan
                    }
                })
            })
            console.log('Welcome email sent to:', contactEmail)
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError)
            // Don't fail the webhook if email fails
        }

        return NextResponse.json({
            received: true,
            message: 'Organization created successfully',
            organizationId: result.organization.id,
        })
    } catch (error: any) {
        console.error('Error processing Mercado Pago webhook:', error)
        return NextResponse.json(
            { error: 'Webhook processing failed', details: error.message },
            { status: 500 }
        )
    }
}

// Handle GET requests (Mercado Pago may send test GET requests)
export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Webhook endpoint active' })
}

/**
 * Handle preapproval (subscription) events
 */
async function handlePreapprovalEvent(data: any, action: string) {
    try {
        const preapprovalId = data?.id

        if (!preapprovalId) {
            console.error('No preapproval ID in webhook data')
            return NextResponse.json({ error: 'No preapproval ID' }, { status: 400 })
        }

        // Fetch preapproval details from Mercado Pago
        const preapprovalClient = new PreApproval(mercadopago)
        const preapproval = await preapprovalClient.get({ id: preapprovalId })

        console.log('Preapproval event:', {
            id: preapproval.id,
            status: preapproval.status,
            action
        })

        // Find subscription by preapprovalId
        const subscription = await prisma.subscription.findUnique({
            where: { preapprovalId },
            include: { organization: true }
        })

        if (!subscription) {
            console.log('Subscription not found for preapprovalId:', preapprovalId)
            return NextResponse.json({ received: true })
        }

        // Update subscription based on status
        switch (preapproval.status) {
            case 'authorized':
                // Subscription activated
                await prisma.$transaction([
                    prisma.subscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: 'authorized',
                            paymentFailures: 0,
                            gracePeriodUntil: null
                        }
                    }),
                    prisma.organization.update({
                        where: { id: subscription.organizationId },
                        data: { subscriptionStatus: 'active' }
                    })
                ])
                console.log('Subscription activated:', subscription.id)
                break

            case 'paused':
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'paused' }
                })
                break

            case 'cancelled':
                await prisma.$transaction([
                    prisma.subscription.update({
                        where: { id: subscription.id },
                        data: { status: 'cancelled' }
                    }),
                    prisma.organization.update({
                        where: { id: subscription.organizationId },
                        data: {
                            subscriptionStatus: 'cancelled',
                            subscriptionPlan: 'basic',
                            maxTables: 5,
                            maxUsers: 2
                        }
                    })
                ])
                console.log('Subscription cancelled, downgraded to basic:', subscription.id)
                break
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Error handling preapproval event:', error)
        return NextResponse.json({ error: 'Failed to process preapproval' }, { status: 500 })
    }
}

/**
 * Handle recurring subscription payment events
 */
async function handleSubscriptionPayment(data: any) {
    try {
        const paymentId = data?.id

        if (!paymentId) {
            console.error('No payment ID in subscription payment webhook')
            return NextResponse.json({ error: 'No payment ID' }, { status: 400 })
        }

        // Fetch payment details
        const paymentClient = new Payment(mercadopago)
        const payment = await paymentClient.get({ id: paymentId })

        console.log('Subscription payment:', {
            id: payment.id,
            status: payment.status,
            preapproval_id: (payment as any).preapproval_id
        })

        const preapprovalId = (payment as any).preapproval_id

        if (!preapprovalId) {
            console.log('No preapproval_id in payment')
            return NextResponse.json({ received: true })
        }

        // Find subscription
        const subscription = await prisma.subscription.findUnique({
            where: { preapprovalId },
            include: { organization: true }
        })

        if (!subscription) {
            console.log('Subscription not found for preapprovalId:', preapprovalId)
            return NextResponse.json({ received: true })
        }

        if (payment.status === 'approved') {
            // Payment successful
            const nextBilling = getNextBillingDate()

            // Check if there's a pending plan change
            const updates: any = {
                lastPaymentDate: new Date(),
                nextBillingDate: nextBilling,
                currentPeriodStart: new Date(),
                currentPeriodEnd: nextBilling,
                paymentFailures: 0,
                gracePeriodUntil: null
            }

            // Apply pending plan change if exists
            if (subscription.pendingPlan) {
                updates.plan = subscription.pendingPlan
                updates.amount = subscription.pendingPlanAmount
                updates.pendingPlan = null
                updates.pendingPlanAmount = null

                const limits = getPlanLimits(subscription.pendingPlan as any)

                // Update organization with new plan
                await prisma.organization.update({
                    where: { id: subscription.organizationId },
                    data: {
                        subscriptionPlan: subscription.pendingPlan,
                        maxTables: limits.maxTables,
                        maxUsers: limits.maxUsers,
                        subscriptionStatus: 'active'
                    }
                })

                console.log('Applied pending plan change:', subscription.pendingPlan)
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: updates
            })

            console.log('Subscription payment processed successfully')
        } else if (payment.status === 'rejected') {
            // Payment failed
            const failures = subscription.paymentFailures + 1
            const gracePeriod = getGracePeriodEnd(7)

            await prisma.$transaction([
                prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        paymentFailures: failures,
                        gracePeriodUntil: gracePeriod
                    }
                }),
                prisma.organization.update({
                    where: { id: subscription.organizationId },
                    data: {
                        subscriptionStatus: failures >= 3 ? 'blocked' : 'past_due'
                    }
                })
            ])

            console.log(`Payment failed (${failures}/3). Grace period until:`, gracePeriod)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Error handling subscription payment:', error)
        return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
    }
}
