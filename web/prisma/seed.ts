import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Check if users exist first
    let waiter = await prisma.user.findFirst({ where: { username: 'mesero1' } })
    if (!waiter) {
        waiter = await prisma.user.create({
            data: {
                username: 'mesero1',
                password: hashedPassword,
                name: 'Juan Pérez',
                role: 'mesero',
                language: 'es',
            },
        })
        console.log('✅ Created waiter:', waiter.username)
    } else {
        console.log('ℹ️  Waiter already exists:', waiter.username)
    }

    let admin = await prisma.user.findFirst({ where: { username: 'admin' } })
    if (!admin) {
        admin = await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                name: 'Administrador',
                role: 'admin',
                language: 'es',
            },
        })
        console.log('✅ Created admin:', admin.username)
    } else {
        console.log('ℹ️  Admin already exists:', admin.username)
    }

    // Create tables
    let tablesCreated = 0
    for (let i = 1; i <= 12; i++) {
        const existing = await prisma.table.findFirst({ where: { number: i, organizationId: null } })
        if (!existing) {
            await prisma.table.create({
                data: {
                    number: i,
                    capacity: 4,
                    status: i <= 2 ? 'ocupada' : 'disponible',
                },
            })
            tablesCreated++
        }
    }
    console.log(`✅ Tables: ${tablesCreated} created, ${12 - tablesCreated} already existed`)

    // Create menu items
    const menuItems = [
        { name: 'Hamburguesa Clásica', category: 'Platos Fuertes', price: 15000, estimatedTime: 15 },
        { name: 'Hamburguesa BBQ', category: 'Platos Fuertes', price: 18000, estimatedTime: 15 },
        { name: 'Pizza Margarita', category: 'Platos Fuertes', price: 25000, estimatedTime: 20 },
        { name: 'Pizza Pepperoni', category: 'Platos Fuertes', price: 28000, estimatedTime: 20 },
        { name: 'Papas Fritas', category: 'Entradas', price: 8000, estimatedTime: 10 },
        { name: 'Aros de Cebolla', category: 'Entradas', price: 9000, estimatedTime: 10 },
        { name: 'Ensalada César', category: 'Entradas', price: 12000, estimatedTime: 8 },
        { name: 'Coca Cola', category: 'Bebidas', price: 5000, estimatedTime: 2, isDirect: true },
        { name: 'Limonada Natural', category: 'Bebidas', price: 6000, estimatedTime: 5 },
        { name: 'Jugo de Naranja', category: 'Bebidas', price: 7000, estimatedTime: 5 },
        { name: 'Tiramisu', category: 'Postres', price: 12000, estimatedTime: 5 },
        { name: 'Brownie con Helado', category: 'Postres', price: 10000, estimatedTime: 8 },
    ]

    let itemsCreated = 0
    for (const item of menuItems) {
        const existing = await prisma.menuItem.findFirst({ where: { name: item.name } })
        if (!existing) {
            await prisma.menuItem.create({
                data: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    estimatedTime: item.estimatedTime,
                    minPrepTime: item.estimatedTime,
                    available: true,
                    isDirect: item.isDirect || false,
                },
            })
            itemsCreated++
        }
    }
    console.log(`✅ Menu items: ${itemsCreated} created, ${menuItems.length - itemsCreated} already existed`)

    console.log('\n🎉 Seed completed successfully!')
    console.log('\n📝 Test credentials:')
    console.log('   Waiter: mesero1 / password123')
    console.log('   Admin:  admin / password123')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
