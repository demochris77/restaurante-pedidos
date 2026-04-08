import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { plan, restaurantName, slug, contactEmail, adminName, username, password } = body

        // 1. Validate plan and trial availability
        const planDef = await (prisma as any).planDefinition.findUnique({
            where: { slug: plan }
        })

        if (!planDef) {
            return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
        }

        if (!planDef.hasTrial) {
            return NextResponse.json({ error: 'Este plan no ofrece periodo de prueba' }, { status: 400 })
        }

        // 2. Check if slug exists
        const existingOrg = await prisma.organization.findUnique({ where: { slug } })
        if (existingOrg) {
            return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 })
        }

        // 3. Database Transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create Organization with Trial status
            const trialEndsAt = new Date()
            trialEndsAt.setDate(trialEndsAt.getDate() + (planDef.trialDays || 7))

            const organization = await tx.organization.create({
                data: {
                    name: restaurantName,
                    slug,
                    subscriptionPlan: plan,
                    subscriptionStatus: 'trial',
                    trialEndsAt,
                    maxTables: planDef.maxTables,
                    maxUsers: planDef.maxUsers,
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

            // Create Trial Subscription record
            await tx.subscription.create({
                data: {
                    organizationId: organization.id,
                    plan,
                    status: 'trialing',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: trialEndsAt,
                }
            })

            return { organization, user }
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Cuenta creada exitosamente con periodo de prueba',
            orgId: result.organization.id 
        })

    } catch (error: any) {
        console.error('Trial Registration Error:', error)
        return NextResponse.json({ error: error.message || 'Error al procesar el registro de prueba' }, { status: 500 })
    }
}
