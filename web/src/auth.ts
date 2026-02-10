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

                    if (!user.password) {
                        console.log('User has no password set (OAuth user):', username);
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
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger }) {
            // 1. Al iniciar sesión por primera vez (user existe)
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.organizationId = (user as any).organizationId;
                token.organizationSlug = (user as any).organizationSlug;
            }

            // 2. REFRESH: Si el token NO tiene organización, vamos a la DB a ver si ya se le asignó una (vía Webhook)
            // Esto evita que el usuario se quede atrapado en /register si ya pagó
            if (!token.organizationId) {
                const userDb = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { organizationId: true, role: true, organization: { select: { slug: true } } }
                });

                if (userDb?.organizationId) {
                    token.organizationId = userDb.organizationId;
                    token.role = userDb.role;
                    token.organizationSlug = userDb.organization?.slug;
                    console.log(`Session Refreshed for user ${token.id}: Found Org ${token.organizationSlug}`);
                }
            }

            // 3. Si tenemos ID de organización pero NO tenemos el slug (fallback de seguridad)
            if (token.organizationId && !token.organizationSlug) {
                const org = await prisma.organization.findUnique({
                    where: { id: token.organizationId as string },
                    select: { slug: true }
                });
                if (org) {
                    token.organizationSlug = org.slug;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.organizationId = token.organizationId as string | undefined;
                session.user.organizationSlug = token.organizationSlug as string | undefined;
            }
            return session;
        }
    }
});
