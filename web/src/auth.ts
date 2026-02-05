import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod'; // We need zod for validation, it is usually included or we install it
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ username: z.string(), password: z.string() })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { username, password } = parsedCredentials.data;

                    const user = await prisma.user.findFirst({
                        where: { username },
                        include: { organization: true }
                    });

                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        // Convert null to undefined for NextAuth compatibility
                        return {
                            ...user,
                            organizationId: user.organizationId ?? undefined,
                            organizationSlug: user.organization?.slug,
                        };
                    }
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
