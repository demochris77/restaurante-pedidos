import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { createMPSubscription, updateMPSubscriptionAmount, PLAN_PRICING, type PlanType } from '@/lib/mercadopago-subscriptions'
import { canDowngradeToPlan } from '@/lib/subscription-validation'

/**
 * POST /api/organization/upgrade
 * Upgrade or downgrade organization plan
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's organization
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { organization: true }
        })

        if (!currentUser?.organizationId || !currentUser.organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            )
        }

        // Only admin can upgrade plan
        if (currentUser.role !== 'admin') {
            return NextResponse.json(
                { error: 'Only administrators can upgrade plans' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { plan } = body as { plan: PlanType }

        if (!plan || !['basic', 'professional', 'enterprise'].includes(plan)) {
            return NextResponse.json(
                { error: 'Invalid plan' },
                { status: 400 }
            )
        }

        const currentPlan = currentUser.organization.subscriptionPlan
        const isTrial = currentUser.organization.subscriptionStatus === 'trial'
        
        // Trial users must pay immediately to activate any plan.
        // Paid users have ALL changes (up or down) scheduled for the next billing cycle.
        const shouldPayNow = isTrial

        // Get current subscription
        const subscription = await prisma.subscription.findUnique({
            where: { organizationId: currentUser.organizationId }
        })

        if (shouldPayNow) {
            // Determine email to use
            let userEmail = session.user.email
            if (!userEmail) {
                // Determine if username is email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                const username = currentUser.username || ''
                if (username && emailRegex.test(username)) {
                    userEmail = username
                } else {
                    // Fallback to constructed email
                    userEmail = `admin@${currentUser.organization.slug}.com`
                }
            }

            // UPGRADE: Create new subscription
            const mpResult = await createMPSubscription({
                plan,
                organizationId: currentUser.organization.slug,
                organizationName: currentUser.organization.name,
                userEmail: userEmail,
                trialDays: 0 // No trial for upgrades
            })

            if (!mpResult.success || !mpResult.initPoint) {
                return NextResponse.json(
                    { error: mpResult.error || 'Failed to create subscription' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                isUpgrade: true,
                initPoint: mpResult.initPoint,
                message: 'Redirecting to payment...'
            })
        } else {
            // DOWNGRADE: Validate and schedule for next billing cycle
            const validation = await canDowngradeToPlan(currentUser.organizationId, plan)

            if (!validation.canDowngrade) {
                return NextResponse.json({
                    error: 'Cannot downgrade',
                    reason: validation.reason,
                    details: {
                        currentTables: validation.currentTables,
                        currentUsers: validation.currentUsers,
                        newMaxTables: validation.newMaxTables,
                        newMaxUsers: validation.newMaxUsers,
                        tablesToRemove: validation.tablesToRemove,
                        usersToRemove: validation.usersToRemove
                    }
                }, { status: 400 })
            }



            if (!subscription) {
                return NextResponse.json(
                    { error: 'No active subscription found' },
                    { status: 404 }
                )
            }

            // Schedule plan change for next billing cycle (Upgrades and Downgrades for paid users)
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    pendingPlan: plan,
                    pendingPlanAmount: PLAN_PRICING[plan]
                }
            })

            // Sync with Mercado Pago to update the amount for the next bill
            if (subscription.preapprovalId) {
                await updateMPSubscriptionAmount(subscription.preapprovalId, PLAN_PRICING[plan])
            }

            return NextResponse.json({
                success: true,
                isUpgrade: false,
                isImmediate: false,
                message: 'Plan change scheduled for next billing cycle',
                effectiveDate: subscription.nextBillingDate,
                currentPlan,
                newPlan: plan
            })
        }
    } catch (error) {
        console.error('Error upgrading plan:', error)
        return NextResponse.json(
            { error: 'Failed to upgrade plan' },
            { status: 500 }
        )
    }
}
