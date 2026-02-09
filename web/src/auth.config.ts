import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const hasOrg = !!auth?.user?.organizationId;
            const orgSlug = auth?.user?.organizationSlug;
            const role = auth?.user?.role;

            const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
            const isPublicPage = nextUrl.pathname === '/' ||
                nextUrl.pathname === '/pricing' ||
                nextUrl.pathname === '/about' ||
                nextUrl.pathname === '/contact' ||
                nextUrl.pathname === '/terms' ||
                nextUrl.pathname === '/privacy';

            // 1. Si no está logueado y trata de entrar a cualquier cosa que no sea pública o auth, al login
            if (!isLoggedIn && !isPublicPage && !isAuthPage) {
                return false;
            }

            // 2. Si está logueado pero NO tiene organización:
            // Forzar redirección a /register, excepto si ya está en /register o páginas públicas
            if (isLoggedIn && !hasOrg && nextUrl.pathname !== '/register' && !isPublicPage) {
                return Response.redirect(new URL('/register', nextUrl));
            }

            // 3. Redirección inteligente de la ruta base /dashboard o páginas de auth
            // Si está logueado y tiene organización, enviarlo a su panel según rol
            if (isLoggedIn && hasOrg && orgSlug) {
                if (isAuthPage || nextUrl.pathname === '/dashboard') {
                    let targetPath = `/${orgSlug}/admin/dashboard`; // Default para admin

                    if (role === 'mesero') targetPath = `/${orgSlug}/waiter`;
                    else if (role === 'cocinero') targetPath = `/${orgSlug}/cook`;
                    else if (role === 'cajero') targetPath = `/${orgSlug}/cashier`;

                    return Response.redirect(new URL(targetPath, nextUrl));
                }
            }

            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                // Validamos que user exista y tenga las propiedades antes de asignarlas
                if ('role' in user) token.role = user.role;
                if ('name' in user) token.name = user.name;
                if ('username' in user) token.username = user.username;
                if ('switchToken' in user) token.switchToken = user.switchToken;
                if ('organizationId' in user) token.organizationId = user.organizationId;
                if ('organizationSlug' in user) token.organizationSlug = user.organizationSlug;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                // Aseguramos tipos en la sesión
                session.user.role = token.role as string;
                session.user.name = token.name as string;
                session.user.username = token.username as string;
                session.user.switchToken = token.switchToken as string | undefined;
                session.user.organizationId = token.organizationId as string | undefined;
                session.user.organizationSlug = token.organizationSlug as string | undefined;
            }
            return session;
        }
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
