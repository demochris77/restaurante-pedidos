import { NextRequest, NextResponse } from 'next/server'
import { mercadopago, MERCADOPAGO_PLANS, PlanType } from '@/lib/mercadopago'
import { Payment, PreApproval } from 'mercadopago'
import prisma from '@/lib/prisma'

function getPlanLimits(plan: PlanType) {
    return MERCADOPAGO_PLANS[plan] || MERCADOPAGO_PLANS.professional
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const type = body.type || body.topic
        const id = body.data?.id || body.id || (body.resource && body.resource.split('/').pop())

        console.log(`--- WEBHOOK RECEIVED: ${type} [${id}] ---`)

        if (!id) return NextResponse.json({ received: true })

        // 1. Handle Subscription Status Changes (Preapproval)
        if (type === 'subscription_preapproval' || type === 'preapproval') {
            const preapprovalClient = new PreApproval(mercadopago)
            const sub = await preapprovalClient.get({ id })
            
            if (sub && sub.external_reference) {
                console.log(`Updating subscription status for Org: ${sub.external_reference} to ${sub.status}`)
                await prisma.subscription.update({
                    where: { organizationId: sub.external_reference },
                    data: { 
                        status: sub.status || 'unknown',
                        updatedAt: new Date()
                    }
                })
            }
            return NextResponse.json({ received: true })
        }

        // 2. Handle Payments
        if (type === 'payment') {
            const paymentClient = new Payment(mercadopago)
            const payment = await paymentClient.get({ id })
            const orgId = payment.external_reference

            console.log(`Payment status: ${payment.status} for OrgID: ${orgId}`)

            if (!orgId) {
                console.log('Payment without external_reference. Ignoring.')
                return NextResponse.json({ received: true })
            }

            // A. PAYMENT APPROVED
            if (payment.status === 'approved') {
                const subscription = await prisma.subscription.findUnique({
                    where: { organizationId: orgId }
                })

                if (subscription) {
                    // Update existing subscription
                    const newPeriodEnd = new Date()
                    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)

                    // If there was a pending plan, check if we should promote it
                    const dataToUpdate: any = {
                        status: 'authorized',
                        currentPeriodEnd: newPeriodEnd,
                        lastPaymentDate: new Date(),
                        paymentFailures: 0,
                        gracePeriodUntil: null,
                    }

                    if (subscription.pendingPlan) {
                        dataToUpdate.plan = subscription.pendingPlan
                        dataToUpdate.amount = subscription.pendingPlanAmount
                        dataToUpdate.pendingPlan = null
                        dataToUpdate.pendingPlanAmount = null

                        // Also update Org's plan and limits
                        const limits = getPlanLimits(subscription.pendingPlan as any)
                        await prisma.organization.update({
                            where: { id: orgId },
                            data: {
                                subscriptionPlan: subscription.pendingPlan,
                                subscriptionStatus: 'active',
                                maxTables: limits.maxTables,
                                maxUsers: limits.maxUsers
                            }
                        })
                    }

                    await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: dataToUpdate
                    })

                    console.log(`Subscription extended for Org: ${orgId}. Next: ${newPeriodEnd.toDateString()}`)
                } else {
                    // This might be the FIRST payment (Creation logic)
                    // (Old implementation logic simplified here or handled via metadata)
                    // Since we already have orgs that paid, we should handle creation carefully.
                    // For now, let's assume if no sub exists, it's a new flow.
                    console.log('No subscription found for this payment. It might be a new organization registration.')
                }
            } 
            
            // B. PAYMENT REJECTED
            if (payment.status === 'rejected') {
                const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
                if (sub) {
                    const gracePeriodUntil = sub.gracePeriodUntil || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            paymentFailures: { increment: 1 },
                            gracePeriodUntil
                        }
                    })
                }
                console.log(`Payment failure recorded for Org: ${orgId}`)
            }

            return NextResponse.json({ received: true })
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active' })
}
