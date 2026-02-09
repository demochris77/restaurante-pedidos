import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod'; // We need zod for validation, it is usually included or we install it
import bcrypt from 'bcrypt';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Google,
        Credentials({
            async authorize(credentials) {
                // 1. Check for Switch Token Login (Bypass Password)
                if (credentials?.switchToken && credentials?.username) {
                    const user = await prisma.user.findFirst({
                        where: {
                            username: credentials.username as string,
                            switchToken: credentials.switchToken as string
                        },
                        include: { organization: true }
                    });

                    if (user) {
                        return {
                            ...user,
                            switchToken: user.switchToken ?? undefined,
                            organizationId: user.organizationId ?? undefined,
                            organizationSlug: user.organization?.slug,
                        };
                    }
                    console.log('Invalid switch token for user:', credentials.username);
                    return null;
                }

                // 2. Standard Password Login
                const parsedCredentials = z
                    .object({ username: z.string(), password: z.string() })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { username, password } = parsedCredentials.data;

                    const user = await prisma.user.findFirst({
                        where: { username },
                        include: { organization: true }
                    });

                    if (!user) {
                        console.log('User not found:', username);
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        // Generate new switch token if not exists
                        // In a real app, you might want to rotate this or have multiple tokens per device
                        let switchToken = user.switchToken;
                        if (!switchToken) {
                            // Simple random token for now. 
                            // In prod, use crypto.randomUUID() or similar and maybe hash it if needed, 
                            // but here we act as a session key.
                            const crypto = require('crypto');
                            switchToken = crypto.randomBytes(32).toString('hex');

                            await prisma.user.update({
                                where: { id: user.id },
                                data: { switchToken }
                            });
                        }

                        return {
                            ...user,
                            switchToken: switchToken ?? undefined, // Return to be saved in session
                            organizationId: user.organizationId ?? undefined,
                            organizationSlug: user.organization?.slug,
                        };
                    } else {
                        console.log('Password mismatch for user:', username);
                    }
                } else {
                    console.log('Invalid credentials format');
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
