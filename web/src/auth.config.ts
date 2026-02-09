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

            const isOnDashboard = nextUrl.pathname.startsWith('/admin') ||
                nextUrl.pathname.startsWith('/waiter') ||
                nextUrl.pathname.startsWith('/kitchen');

            const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';

            if (isOnDashboard) {
                if (!isLoggedIn) return false; // Redirect to login
                if (!hasOrg) return Response.redirect(new URL('/register', nextUrl));
                return true;
            }

            if (isAuthPage && isLoggedIn && hasOrg && orgSlug) {
                return Response.redirect(new URL(`/${orgSlug}/admin/dashboard`, nextUrl));
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
