import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Buscando organizaciones sin slug...')

    // Find organizations without slug
    const orgsWithoutSlug = await prisma.organization.findMany({
        where: {
            OR: [
                { slug: null as any },
                { slug: '' }
            ]
        },
        select: {
            id: true,
            name: true,
            slug: true
        }
    })

    console.log(`📊 Encontradas ${orgsWithoutSlug.length} organizaciones sin slug`)

    if (orgsWithoutSlug.length === 0) {
        console.log('✅ Todas las organizaciones ya tienen slug asignado')
        return
    }

    // Generate slugs for organizations
    for (const org of orgsWithoutSlug) {
        // Generate slug from organization name
        let baseSlug = org.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            .substring(0, 50) // Limit length

        // Ensure slug is unique
        let slug = baseSlug
        let counter = 1

        while (true) {
            const existing = await prisma.organization.findUnique({
                where: { slug }
            })

            if (!existing) break

            slug = `${baseSlug}-${counter}`
            counter++
        }

        // Update organization with slug
        await prisma.organization.update({
            where: { id: org.id },
            data: { slug }
        })

        console.log(`✅ Asignado slug "${slug}" a organización "${org.name}"`)
    }

    console.log(`\n🎉 Migración completada! ${orgsWithoutSlug.length} organizaciones actualizadas`)
}

main()
    .catch((e) => {
        console.error('❌ Error en migración:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
