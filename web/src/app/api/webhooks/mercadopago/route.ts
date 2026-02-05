import { NextRequest, NextResponse } from 'next/server'
import { mercadopago, MERCADOPAGO_PLANS, PlanType } from '@/lib/mercadopago'
import { Payment } from 'mercadopago'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Mercado Pago webhook received:', body)

        // Mercado Pago sends different types of notifications
        const { type, data, action } = body

        // We only process payment notifications
        if (type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') {
            console.log('Ignoring non-payment notification:', type, action)
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
                stripeSubscriptionId: payment.id?.toString(), // We reuse this field for MP payment ID
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
                    stripeCustomerId: payment.payer?.id?.toString() || null, // Reuse for MP payer ID
                    stripeSubscriptionId: payment.id?.toString() || null, // Reuse for MP payment ID
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                },
            })

            return { organization, user, subscription }
        })

        console.log('Successfully created organization:', result.organization.slug)
        console.log('Admin user created:', result.user.username)

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
