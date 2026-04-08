import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting Hamelin Foods SaaS seed...')

    const hashedPassword = await bcrypt.hash('admin123', 10)

    // 1. Seed Plan Definitions
    console.log('📦 Seeding Plan Definitions...')
    const plans = [
        {
            slug: 'basic',
            name: 'Starter',
            price: 29.00,
            maxTables: 5,
            maxUsers: 2,
            features: ['Basic Orders', 'Monthly Reports', 'Email Support']
        },
        {
            slug: 'professional',
            name: 'Professional',
            price: 79.00,
            maxTables: 20,
            maxUsers: 10,
            features: ['Full Orders', 'Real-time Reports', 'Priority Support', 'Kitchen Integration', 'Inventory']
        },
        {
            slug: 'enterprise',
            name: 'Enterprise',
            price: 199.00,
            maxTables: 999,
            maxUsers: 999,
            features: ['Unlimited everything', 'Multi-restaurant', 'API Access', '24/7 Support', 'Account Manager']
        }
    ]

    for (const plan of plans) {
        await prisma.planDefinition.upsert({
            where: { slug: plan.slug },
            update: plan,
            create: plan,
        })
    }

    // 2. Create Organization
    console.log('🏢 Creating Organization: Hamelin Foods...')
    const org = await prisma.organization.upsert({
        where: { slug: 'hamelin-foods' },
        update: {
            subscriptionPlan: 'professional',
            subscriptionStatus: 'active',
            maxTables: 20,
            maxUsers: 10,
        },
        create: {
            name: 'Hamelin Foods',
            slug: 'hamelin-foods',
            subscriptionPlan: 'professional',
            subscriptionStatus: 'active',
            maxTables: 20,
            maxUsers: 10,
            email: 'admin@hamelin.com',
            phone: '555-0100',
        }
    })

    // 3. Create Subscription Record
    console.log('💳 Creating Subscription Record...')
    await prisma.subscription.upsert({
        where: { organizationId: org.id },
        update: {
            plan: 'professional',
            status: 'active',
        },
        create: {
            organizationId: org.id,
            plan: 'professional',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
    })

    // 4. Create Staff Users
    console.log('👥 Creating Staff Users...')
    const staff = [
        { username: 'admin', name: 'Admin Hamelin', role: 'admin' },
        { username: 'mesero', name: 'Juan Waiter', role: 'mesero' },
        { username: 'cocinero', name: 'Chef Mario', role: 'cocinero' },
        { username: 'cajero', name: 'Ana Cashier', role: 'cajero' },
    ]

    for (const member of staff) {
        await prisma.user.upsert({
            where: { username: member.username },
            update: {
                name: member.name,
                role: member.role,
                organizationId: org.id,
                password: hashedPassword,
            },
            create: {
                username: member.username,
                name: member.name,
                role: member.role,
                organizationId: org.id,
                password: hashedPassword,
                language: 'es',
            }
        })
        console.log(`   ✅ User created: ${member.username} (${member.role})`)
    }

    // 5. Create some initial Tables for the org
    console.log('🪑 Creating tables for Hamelin Foods...')
    for (let i = 1; i <= 5; i++) {
        await prisma.table.upsert({
            where: { 
                unique_table_per_org: {
                    number: i,
                    organizationId: org.id
                }
            },
            update: {},
            create: {
                number: i,
                capacity: 4,
                organizationId: org.id,
                status: 'disponible'
            }
        })
    }

    console.log('\n🎉 Seed completed successfully!')
    console.log('-----------------------------------')
    console.log('Org Slug: hamelin-foods')
    console.log('Credentials (all users):')
    console.log('Password: admin123')
    console.log('Users: admin, mesero, cocinero, cajero')
    console.log('-----------------------------------')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
