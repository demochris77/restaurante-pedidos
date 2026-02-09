import { NextRequest, NextResponse } from 'next/server'
import { mercadopago, MERCADOPAGO_PLANS, PlanType } from '@/lib/mercadopago'
import { Payment } from 'mercadopago'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('--- WEBHOOK RECEIVED ---')
        console.log('Body:', JSON.stringify(body, null, 2))

        // 1. Get Payment ID (handle both notification formats)
        // Format A: { type: 'payment', data: { id: '...' } }
        // Format B: { topic: 'payment', id: '...' }
        let paymentId = body.data?.id || body.id || (body.resource && body.resource.split('/').pop())

        if (!paymentId || (body.type && body.type !== 'payment' && body.topic !== 'payment')) {
            console.log('Ignoring non-payment notification:', body.type || body.topic)
            return NextResponse.json({ received: true })
        }

        console.log('Processing Payment ID:', paymentId)

        // 2. Fetch payment details from Mercado Pago
        const paymentClient = new Payment(mercadopago)
        const payment = await paymentClient.get({ id: paymentId })

        console.log('Payment Status:', payment.status)

        if (payment.status !== 'approved') {
            console.log('Payment not approved yet. Status:', payment.status)
            return NextResponse.json({ received: true })
        }

        // 3. Extract metadata with case-insensitive helper
        const metadata = payment.metadata || {}
        console.log('Metadata from MP:', JSON.stringify(metadata, null, 2))

        const getMeta = (key: string) => {
            const keys = Object.keys(metadata)
            const foundKey = keys.find(k => k.toLowerCase() === key.toLowerCase() || k.toLowerCase() === key.replace(/_/g, '').toLowerCase())
            return foundKey ? metadata[foundKey] : null
        }

        const plan = getMeta('plan')
        const restaurantName = getMeta('restaurant_name') || getMeta('restaurantName')
        const slug = getMeta('slug')
        const contactEmail = getMeta('contact_email') || getMeta('contactEmail')
        const adminName = getMeta('admin_name') || getMeta('adminName')
        const username = getMeta('username')
        const password = getMeta('password')

        if (!plan || !slug || !restaurantName || !username) {
            console.error('CRITICAL: Missing metadata fields in approved payment!', { plan, slug, restaurantName, username })
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        // 4. Check if already processed
        const existingOrg = await prisma.organization.findUnique({ where: { slug } })
        if (existingOrg) {
            console.log('Organization already exists for slug:', slug)
            return NextResponse.json({ received: true, message: 'Already processed' })
        }

        // 5. Database Transaction
        console.log('Starting transaction for slug:', slug)
        const result = await prisma.$transaction(async (tx: any) => {
            const selectedPlan = MERCADOPAGO_PLANS[plan as PlanType] || MERCADOPAGO_PLANS.professional

            // Create Organization
            const organization = await tx.organization.create({
                data: {
                    name: restaurantName,
                    slug,
                    subscriptionPlan: plan,
                    subscriptionStatus: 'active',
                    maxTables: selectedPlan.maxTables,
                    maxUsers: selectedPlan.maxUsers,
                },
            })

            // Find or update user
            const existingUser = await tx.user.findFirst({
                where: { OR: [{ email: contactEmail }, { username }] }
            })

            let user
            if (existingUser) {
                user = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        role: 'admin',
                        organizationId: organization.id,
                        // Update password if it was a temporary one
                        ...(password && !existingUser.password ? { password: await bcrypt.hash(password, 10) } : {})
                    }
                })
            } else {
                user = await tx.user.create({
                    data: {
                        username,
                        email: contactEmail,
                        name: adminName,
                        role: 'admin',
                        organizationId: organization.id,
                        password: password ? await bcrypt.hash(password, 10) : undefined
                    }
                })
            }

            // Create Subscription record
            await tx.subscription.create({
                data: {
                    organizationId: organization.id,
                    plan,
                    status: 'authorized',
                    preapprovalId: paymentId.toString(),
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                }
            })

            return { organization, user }
        })

        console.log('Successfully created Org and Admin!')
        return NextResponse.json({ received: true, orgId: result.organization.id })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active' })
}
