import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's role. */
            role: string
            /** The user's name. */
            name: string
            /** The user's organization ID. */
            organizationId?: string
            /** The user's organization slug. */
            organizationSlug?: string
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        organizationId?: string
        organizationSlug?: string
    }
}
